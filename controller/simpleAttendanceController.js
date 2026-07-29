const Attendance = require("../model/Attendance");

// Get attendance records
exports.getAttendance = async (req, res) => {
  try {
    const { date, employeeId } = req.query;
    const query = {};
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    const attendance = await Attendance.find(query)
      .populate("employeeId", "name employeeId department")
      .sort({ date: -1 });
      
    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance",
      error: error.message,
    });
  }
};

// Create attendance (check-in)
exports.createAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkInTime } = req.body;
    
    // Check if attendance already exists
    const existingAttendance = await Attendance.findOne({
      employeeId,
      date: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      },
    });
    
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this date",
      });
    }
    
    // Use exact current IST time when check-in button is clicked
    let checkInIST = null;
    if (checkInTime) {
      // Get current time in IST using proper timezone conversion
      const now = new Date();
      const istTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
      checkInIST = istTime; // Already in HH:MM format
    }

    const attendance = new Attendance({
      employeeId,
      date,
      status: status || "Present",
      checkIn: checkInIST,
    });
    
    await attendance.save();
    
    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Error creating attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error creating attendance",
      error: error.message,
    });
  }
};

// Update attendance (check-out)
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkOutTime } = req.body;
    
    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }
    
    if (checkOutTime) {
      // Use exact current IST time when check-out button is clicked
      const now = new Date();
      const istTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);
      attendance.checkOut = istTime; // Already in HH:MM format
      
      // Calculate hours if both check-in and check-out exist
      if (attendance.checkIn) {
        const checkIn = new Date(`1970-01-01T${attendance.checkIn}`);
        const checkOut = new Date(`1970-01-01T${attendance.checkOut}`);
        const diff = checkOut - checkIn;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        attendance.hours = `${hours}h ${minutes}m`;
      }
    }
    
    await attendance.save();
    
    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error updating attendance",
      error: error.message,
    });
  }
};

// Delete attendance
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findByIdAndDelete(id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting attendance",
      error: error.message,
    });
  }
};
