const Holiday = require('../model/HolidayCalendar');

// Create new holiday
exports.createHoliday = async (req, res) => {
    try {
        const holiday = new Holiday(req.body);
        await holiday.save();
        res.status(201).json(holiday);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Get all holidays (optionally filter by type/region/branch)
exports.getHolidays = async (req, res) => {
    try {
        const { type, region, branch } = req.query;

        let filter = {};
        if (type) filter.type = type;
        if (region) filter.region = region;
        if (branch) filter.branch = branch;

        const holidays = await Holiday.find(filter);
        res.json(holidays);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update holiday
exports.updateHoliday = async (req, res) => {
    try {
        const updated = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Delete holiday
exports.deleteHoliday = async (req, res) => {
    try {
        await Holiday.findByIdAndDelete(req.params.id);
        res.json({ message: 'Holiday deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
