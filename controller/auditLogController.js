const AuditLog = require('../model/AuditLog');

// Create new audit log
exports.createAuditLog = async (req, res) => {
  try {
    const { staff, action, details, ipAddress } = req.body;
    const log = new AuditLog({ staff, action, details, ipAddress });
    await log.save();
    res.status(201).json({ success: true, message: 'Audit log created', data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating audit log', error });
  }
};

// Get all audit logs (with staff details populated)
exports.getAuditLogs = async (req, res) => {
  try {
    const search = req.query.search || '';
    const query = {
      $or: [
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } },
      ],
    };
    const logs = await AuditLog.find(query)
      .populate('staff', 'name email') // Populate staff name/email
      .sort({ timestamp: -1 });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching logs', error });
  }
};

// Optional: delete a log
exports.deleteAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    await AuditLog.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Audit log deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting log', error });
  }
};
