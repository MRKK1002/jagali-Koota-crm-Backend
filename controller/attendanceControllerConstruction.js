const AttendanceProfessional = require("../model/Attendance");

// Create or update today's attendance for an employee
exports.markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, hours, location } = req.body;
    const attendance = await AttendanceProfessional.findOneAndUpdate(
      { employeeId, date },
      { status, checkIn, checkOut, hours, location },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get all attendance records (with populated employee name & role) with pagination
exports.getAllAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalRecords = await AttendanceProfessional.countDocuments(filter);

    const records = await AttendanceProfessional.find(filter)
      .populate("employeeId", "name role")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Flatten employeeId details into employeeName and employeeRole
    const formatted = records.map((record) => ({
      _id: record._id,
      employeeId: record.employeeId?._id || null,
      employeeName: record.employeeId?.name || "N/A",
      employeeRole: record.employeeId?.role || "N/A",
      date: record.date,
      checkIn: record.checkIn || "--",
      checkOut: record.checkOut || "--",
      hours: record.hours || "--",
      status: record.status || "Absent",
      location: record.location || "Unknown",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    res.json({
      total: totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit),
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get attendance by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const record = await AttendanceProfessional.findById(req.params.id).populate("employeeId", "name role");
    if (!record) return res.status(404).json({ message: "Attendance not found" });

    res.json({
      _id: record._id,
      employeeId: record.employeeId?._id || null,
      employeeName: record.employeeId?.name || "N/A",
      employeeRole: record.employeeId?.role || "N/A",
      date: record.date,
      checkIn: record.checkIn || "--",
      checkOut: record.checkOut || "--",
      hours: record.hours || "--",
      status: record.status || "Absent",
      location: record.location || "Unknown",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update attendance by ID
exports.updateAttendance = async (req, res) => {
  try {
    const record = await AttendanceProfessional.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!record) return res.status(404).json({ message: "Attendance not found" });
    res.json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get attendance by employeeId
exports.getAttendanceByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await AttendanceProfessional.find({ employeeId })
      .populate("employeeId", "name role")
      .sort({ date: -1 });

    if (!records || records.length === 0) {
      return res.status(404).json({ message: "No attendance records found for this employee" });
    }

    const formatted = records.map((record) => ({
      _id: record._id,
      employeeId: record.employeeId?._id || null,
      employeeName: record.employeeId?.name || "N/A",
      employeeRole: record.employeeId?.role || "N/A",
      date: record.date,
      checkIn: record.checkIn || "--",
      checkOut: record.checkOut || "--",
      hours: record.hours || "--",
      status: record.status || "Absent",
      location: record.location || "Unknown",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    return res.status(200).json({ message: "Attendance records found", data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
