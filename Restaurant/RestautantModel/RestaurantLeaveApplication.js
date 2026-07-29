const mongoose = require("mongoose");

const leaveApplicationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantEmployee",
      required: true,
    },
    empId: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    
    // Leave Details
    leaveType: {
      type: String,
      enum: ["Sick Leave", "Casual Leave", "Annual Leave", "Emergency Leave"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    
    // Approval Workflow
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    
    // Cancellation tracking
    cancelledAt: { type: Date },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    // Edit tracking
    editedAt: { type: Date },
    editHistory: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      editedAt: { type: Date, default: Date.now }
    }],
    
    // Attendance override tracking
    overrideAttendance: { type: Boolean, default: false },
    originalAttendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantAttendanceRecord"
    },
    
    // Supporting Documents
    attachments: [{ type: String }], // Array of file URLs
    
    // Notes
    employeeNotes: { type: String },
    adminNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
leaveApplicationSchema.index({ employee: 1, startDate: 1 });
leaveApplicationSchema.index({ status: 1 });
leaveApplicationSchema.index({ empId: 1 });
leaveApplicationSchema.index({ startDate: 1, endDate: 1 });

// Calculate total days before saving
leaveApplicationSchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day
    this.totalDays = diffDays;
  }
  next();
});

// Instance method to approve leave
leaveApplicationSchema.methods.approve = async function(userId, adminNotes = "") {
  this.status = "Approved";
  this.approvedBy = userId;
  this.approvedDate = new Date();
  if (adminNotes) {
    this.adminNotes = adminNotes;
  }
  
  // Create attendance records for the leave period
  const AttendanceRecord = require('./RestaurantAttendanceRecord');
  const Employee = require('./RestaurantEmployeeSchema');
  
  const employee = await Employee.findById(this.employee);
  if (!employee) {
    throw new Error("Employee not found");
  }
  
  const attendanceRecords = [];
  const currentDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  
  while (currentDate <= endDate) {
    const dateForRecord = new Date(currentDate);
    dateForRecord.setHours(0, 0, 0, 0);
    
    // Check if record already exists
    const existingRecord = await AttendanceRecord.findOne({
      employee: this.employee,
      date: {
        $gte: dateForRecord,
        $lt: new Date(dateForRecord.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    
    if (existingRecord) {
      // Update existing record to Leave status
      existingRecord.status = "Leave";
      existingRecord.leaveType = this.leaveType;
      existingRecord.leaveReason = this.reason;
      existingRecord.approved = true;
      existingRecord.approvedBy = userId;
      if (existingRecord.punchIn) {
        existingRecord.punchIn = null;
      }
      if (existingRecord.punchOut) {
        existingRecord.punchOut = null;
      }
      await existingRecord.save();
      attendanceRecords.push(existingRecord);
    } else {
      // Create new leave record
      const attendanceRecord = new AttendanceRecord({
        employee: this.employee,
        empId: employee.empId || employee.employeeId,
        employeeName: employee.name,
        date: dateForRecord,
        status: "Leave",
        leaveType: this.leaveType,
        leaveReason: this.reason,
        approved: true,
        approvedBy: userId,
      });
      await attendanceRecord.save();
      attendanceRecords.push(attendanceRecord);
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  await this.save();
  return { leave: this, attendanceRecords };
};

// Instance method to reject leave
leaveApplicationSchema.methods.reject = function(userId, rejectionReason) {
  this.status = "Rejected";
  this.approvedBy = userId;
  this.approvedDate = new Date();
  this.rejectionReason = rejectionReason;
  return this.save();
};

// Static method to check for overlapping leaves
leaveApplicationSchema.statics.checkOverlap = async function(employeeId, startDate, endDate, excludeId = null) {
  const query = {
    employee: employeeId,
    status: { $in: ["Pending", "Approved"] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      },
    ],
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const overlapping = await this.find(query);
  return overlapping.length > 0 ? overlapping : null;
};

// Static method to get pending leaves
leaveApplicationSchema.statics.getPending = function() {
  return this.find({ status: "Pending" })
    .populate('employee', 'name empId designation department')
    .sort({ appliedDate: 1 });
};

// Static method to get employee leave balance
leaveApplicationSchema.statics.getLeaveBalance = async function(employeeId, year) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  
  const approvedLeaves = await this.find({
    employee: employeeId,
    status: "Approved",
    startDate: { $gte: startOfYear, $lte: endOfYear },
  });
  
  const balance = {
    sickLeave: 0,
    casualLeave: 0,
    annualLeave: 0,
    emergencyLeave: 0,
    total: 0,
  };
  
  approvedLeaves.forEach(leave => {
    balance.total += leave.totalDays;
    switch (leave.leaveType) {
      case "Sick Leave":
        balance.sickLeave += leave.totalDays;
        break;
      case "Casual Leave":
        balance.casualLeave += leave.totalDays;
        break;
      case "Annual Leave":
        balance.annualLeave += leave.totalDays;
        break;
      case "Emergency Leave":
        balance.emergencyLeave += leave.totalDays;
        break;
    }
  });
  
  return balance;
};

module.exports = mongoose.models.RestaurantLeaveApplication || mongoose.model("RestaurantLeaveApplication", leaveApplicationSchema, "restaurantleaveapplications");

