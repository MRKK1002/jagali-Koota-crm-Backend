const AttendanceRecord = require("../model/AttendanceRecord");
const AttendanceMaster = require("../model/AttendanceMaster");
const Employee = require("../model/EmployeeRegistration");
const { Parser } = require("json2csv");

// Check-in employee
exports.checkIn = async (req, res) => {
    try {
        const { employeeId, notes } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if already checked in today
        const existingAttendance = await AttendanceRecord.findOne({
            employeeId,
            date: today,
        });

        if (existingAttendance && existingAttendance.checkIn) {
            return res.status(400).json({
                message: "Already checked in today",
                attendance: existingAttendance
            });
        }

        // Get attendance master for shift timing
        const master = await AttendanceMaster.findOne({
            employeeId,
            isActive: true
        }).populate('employeeId', 'name empId designation department');

        if (!master) {
            return res.status(404).json({
                message: "Attendance master not found for this employee"
            });
        }

        // Parse shift start time
        const [startHour, startMinute] = master.shift.startTime.split(':').map(Number);
        const checkInTime = new Date();
        const standardStartTime = new Date(checkInTime);
        standardStartTime.setHours(startHour, startMinute, 0, 0);

        let lateMinutes = 0;
        if (checkInTime > standardStartTime) {
            lateMinutes = Math.round((checkInTime - standardStartTime) / (1000 * 60));
        }

        // Create or update attendance record
        const attendance = await AttendanceRecord.findOneAndUpdate(
            { employeeId, date: today },
            {
                checkIn: checkInTime,
                status: "present",
                lateMinutes,
                notes: notes || "",
                approved: true
            },
            { upsert: true, new: true, runValidators: true }
        ).populate("employeeId", "name empId designation department");

        res.status(200).json({
            message: "Checked in successfully",
            attendance,
        });
    } catch (error) {
        console.error("Check-in error:", error);
        res.status(500).json({ message: "Error checking in", error: error.message });
    }
};

// Check-out employee
exports.checkOut = async (req, res) => {
    try {
        const { employeeId, notes } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find today's attendance record
        const attendance = await AttendanceRecord.findOne({
            employeeId,
            date: today,
        });

        if (!attendance) {
            return res.status(404).json({ message: "No check-in record found for today" });
        }

        if (attendance.checkOut) {
            return res.status(400).json({
                message: "Already checked out today",
                attendance
            });
        }

        // Get attendance master for shift timing
        const master = await AttendanceMaster.findOne({
            employeeId,
            isActive: true
        });

        const checkOutTime = new Date();
        let overtimeMinutes = 0;

        if (master) {
            // Parse shift end time
            const [endHour, endMinute] = master.shift.endTime.split(':').map(Number);
            const standardEndTime = new Date(checkOutTime);
            standardEndTime.setHours(endHour, endMinute, 0, 0);

            if (checkOutTime > standardEndTime) {
                overtimeMinutes = Math.round((checkOutTime - standardEndTime) / (1000 * 60));
            }
        }

        // Update attendance record
        attendance.checkOut = checkOutTime;
        attendance.overtimeMinutes = overtimeMinutes;
        if (notes) attendance.notes = notes;
        attendance.approved = true;

        await attendance.save();
        await attendance.populate("employeeId", "name empId designation department");

        res.status(200).json({
            message: "Checked out successfully",
            attendance,
        });
    } catch (error) {
        console.error("Check-out error:", error);
        res.status(500).json({ message: "Error checking out", error: error.message });
    }
};

// Get today's attendance for an employee
exports.getTodayAttendance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await AttendanceRecord.findOne({
            employeeId,
            date: today,
        }).populate("employeeId", "name empId designation department");

        res.status(200).json({ attendance });
    } catch (error) {
        console.error("Get today attendance error:", error);
        res.status(500).json({ message: "Error fetching attendance", error: error.message });
    }
};

// Get attendance for a specific period
exports.getAttendanceByPeriod = async (req, res) => {
    try {
        const { employeeId, startDate, endDate } = req.query;
        let query = {};

        if (employeeId) query.employeeId = employeeId;
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const attendance = await AttendanceRecord.find(query)
            .populate("employeeId", "name empId designation department")
            .sort({ date: -1 });

        res.status(200).json({ attendance });
    } catch (error) {
        console.error("Get attendance error:", error);
        res.status(500).json({ message: "Error fetching attendance", error: error.message });
    }
};

// Get attendance summary for admin dashboard
exports.getAttendanceSummary = async (req, res) => {
    try {
        const { month, year, department } = req.query;

        // Calculate start and end dates for the selected month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        let employeeFilter = {};
        if (department) {
            employeeFilter = { department: { $regex: department, $options: "i" } };
        }

        // Get all employees (filtered by department if provided)
        const employees = await Employee.find(employeeFilter)
            .select("_id name empId designation department");

        // Get attendance for all employees in the selected month
        const attendance = await AttendanceRecord.find({
            date: { $gte: startDate, $lte: endDate },
        }).populate("employeeId", "name empId designation department");

        // Calculate summary statistics
        const totalEmployees = employees.length;
        let presentCount = 0;
        let absentCount = 0;
        let leaveCount = 0;
        let lateCount = 0;

        attendance.forEach(record => {
            if (record.status === "present") presentCount++;
            if (record.status === "absent") absentCount++;
            if (record.status === "leave") leaveCount++;
            if (record.lateMinutes > 0) lateCount++;
        });

        const averageAttendance = totalEmployees > 0
            ? (presentCount / (totalEmployees * endDate.getDate())) * 100
            : 0;

        res.status(200).json({
            summary: {
                totalEmployees,
                presentCount,
                absentCount,
                leaveCount,
                lateCount,
                averageAttendance: averageAttendance.toFixed(2),
            },
            attendance,
            employees,
        });
    } catch (error) {
        console.error("Get attendance summary error:", error);
        res.status(500).json({ message: "Error fetching attendance summary", error: error.message });
    }
};

// Update attendance status (admin function)
exports.updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, approved, leaveType } = req.body;

        const attendance = await AttendanceRecord.findByIdAndUpdate(
            id,
            {
                status,
                notes,
                approved,
                leaveType: status === "leave" ? leaveType : null,
                approvedBy: req.user?.id
            },
            { new: true }
        ).populate("employeeId", "name empId designation department");

        if (!attendance) {
            return res.status(404).json({ message: "Attendance record not found" });
        }

        res.status(200).json({
            message: "Attendance updated successfully",
            attendance,
        });
    } catch (error) {
        console.error("Update attendance error:", error);
        res.status(500).json({ message: "Error updating attendance", error: error.message });
    }
};

// Export attendance data
exports.exportAttendance = async (req, res) => {
    try {
        const { startDate, endDate, format = "csv" } = req.query;

        const query = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const attendance = await AttendanceRecord.find(query)
            .populate("employeeId", "name empId designation department")
            .sort({ date: 1, "employeeId.name": 1 });

        if (format === "csv") {
            // Convert to CSV
            const csvData = [];
            csvData.push([
                "Date", "Employee ID", "Name", "Designation", "Department",
                "Check-In", "Check-Out", "Status", "Leave Type",
                "Late Minutes", "Overtime Minutes", "Notes"
            ]);

            attendance.forEach(record => {
                csvData.push([
                    record.date.toISOString().split('T')[0],
                    record.employeeId.empId,
                    record.employeeId.name,
                    record.employeeId.designation,
                    record.employeeId.department,
                    record.checkIn ? record.checkIn.toTimeString().split(' ')[0] : "N/A",
                    record.checkOut ? record.checkOut.toTimeString().split(' ')[0] : "N/A",
                    record.status,
                    record.leaveType || "",
                    record.lateMinutes,
                    record.overtimeMinutes,
                    record.notes || ""
                ]);
            });

            const csvContent = csvData.map(row => row.join(",")).join("\n");

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=attendance-${new Date().toISOString().split('T')[0]}.csv`);
            res.send("\uFEFF" + csvContent);
        } else {
            // JSON format
            res.status(200).json({ attendance });
        }
    } catch (error) {
        console.error("Export attendance error:", error);
        res.status(500).json({ message: "Error exporting attendance", error: error.message });
    }
};

// Get employee attendance summary
exports.getEmployeeSummary = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;

        // Calculate start and end dates for the selected month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const summary = await AttendanceRecord.getSummary(employeeId, startDate, endDate);

        res.status(200).json({
            employeeId,
            period: { startDate, endDate },
            summary
        });
    } catch (error) {
        console.error("Get employee summary error:", error);
        res.status(500).json({ message: "Error fetching employee summary", error: error.message });
    }
};

module.exports = exports;