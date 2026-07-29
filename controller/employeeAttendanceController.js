const Attendance = require('../model/Attendance');

// Check in with exact location support
exports.checkIn = async (req, res) => {
  try {
    const { location, exactLocationData } = req.body;
    const employeeIdString = req.user.employeeId;
    
    console.log('Check-in request:', { employeeIdString, location, exactLocationData });
    
    // Get the Employee document to get the ObjectId
    const Employee = require('../model/Employee');
    const employee = await Employee.findOne({ employeeId: employeeIdString });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAttendance = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: today }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }

    // Create new attendance record with exact location data
    const now = new Date();
    const attendanceData = {
      employeeId: employee._id,
      date: now,
      checkIn: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      status: 'Present', // Use capital P to match enum
      location: location || 'Mobile App'
    };

    // Add exact location data if provided
    if (exactLocationData) {
      attendanceData.exactLocation = {
        coordinates: {
          latitude: exactLocationData.latitude,
          longitude: exactLocationData.longitude
        },
        accuracy: exactLocationData.accuracy,
        timestamp: exactLocationData.timestamp,
        address: {
          building: exactLocationData.building,
          street: exactLocationData.street,
          area: exactLocationData.area,
          city: exactLocationData.city,
          state: exactLocationData.state,
          pincode: exactLocationData.pincode,
          fullAddress: exactLocationData.fullAddress
        }
      };
      
      console.log('Creating attendance with exact location data:', attendanceData.exactLocation);
    } else {
      console.log('Creating attendance with basic location:', location);
    }

    const attendance = new Attendance(attendanceData);
    await attendance.save();

    res.status(201).json({
      success: true,
      message: exactLocationData ? 'Checked in successfully with exact location' : 'Checked in successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in',
      error: error.message
    });
  }
};

// Check out with exact location support
exports.checkOut = async (req, res) => {
  try {
    const { location, exactLocationData } = req.body;
    const employeeIdString = req.user.employeeId;
    
    console.log('Check-out request:', { employeeIdString, location, exactLocationData });
    
    // Get the Employee document to get the ObjectId
    const Employee = require('../model/Employee');
    const employee = await Employee.findOne({ employeeId: employeeIdString });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: today },
      checkOut: { $exists: false }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No check-in found for today'
      });
    }

    // Update with check-out time
    const now = new Date();
    attendance.checkOut = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    // Ensure status is set to Present when checking out (capital P to match enum)
    attendance.status = 'Present';
    
    // Add checkout location data if provided
    if (exactLocationData) {
      // Initialize exactLocation if it doesn't exist
      if (!attendance.exactLocation) {
        attendance.exactLocation = {};
      }
      
      // Add checkout location data
      attendance.exactLocation.checkoutCoordinates = {
        latitude: exactLocationData.latitude,
        longitude: exactLocationData.longitude
      };
      attendance.exactLocation.checkoutAccuracy = exactLocationData.accuracy;
      attendance.exactLocation.checkoutTimestamp = exactLocationData.timestamp;
      attendance.exactLocation.checkoutAddress = {
        building: exactLocationData.building,
        street: exactLocationData.street,
        area: exactLocationData.area,
        city: exactLocationData.city,
        state: exactLocationData.state,
        pincode: exactLocationData.pincode,
        fullAddress: exactLocationData.fullAddress
      };
      
      console.log('Adding checkout location data:', attendance.exactLocation);
    }
    
    // Calculate hours worked
    if (attendance.checkIn) {
      const checkInTime = new Date(`1970-01-01 ${attendance.checkIn}`);
      const checkOutTime = new Date(`1970-01-01 ${attendance.checkOut}`);
      const diffMs = checkOutTime - checkInTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      attendance.hours = `${hours}h ${minutes}m`;
    }
    
    await attendance.save();

    res.status(200).json({
      success: true,
      message: exactLocationData ? 'Checked out successfully with exact location' : 'Checked out successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check out',
      error: error.message
    });
  }
};

// Get today's status
exports.getTodayStatus = async (req, res) => {
  try {
    const employeeIdString = req.user.employeeId;
    
    // Get the Employee document to get the ObjectId
    const Employee = require('../model/Employee');
    const employee = await Employee.findOne({ employeeId: employeeIdString });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: today }
    });

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get today status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get today\'s status',
      error: error.message
    });
  }
};

// Get attendance history
exports.getHistory = async (req, res) => {
  try {
    const employeeIdString = req.user.employeeId;
    const { limit = 30 } = req.query;
    
    // Get the Employee document to get the ObjectId
    const Employee = require('../model/Employee');
    const employee = await Employee.findOne({ employeeId: employeeIdString });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const attendance = await Attendance.find({ employeeId: employee._id })
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance history',
      error: error.message
    });
  }
};

// Get all attendance for admin panel (no authentication required)
exports.getAllAttendanceForAdmin = async (req, res) => {
  try {
    const { date } = req.query;
    
    let filter = {};
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const Attendance = require('../model/Attendance');
    const Employee = require('../model/Employee');
    
    console.log('Admin attendance request - Date filter:', date);
    console.log('Admin attendance request - Filter:', filter);
    
    // Get attendance records with employee details
    const attendance = await Attendance.find(filter)
      .populate('employeeId', 'name employeeId department designation')
      .sort({ date: -1 });
    
    console.log('Admin attendance found:', attendance.length, 'records');
    
    // Format response to match admin panel expectations with exact location data
    const formattedAttendance = attendance.map(record => ({
      _id: record._id,
      employeeId: record.employeeId,
      status: record.status,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      hours: record.hours,
      location: record.location,
      exactLocation: record.exactLocation, // Include exact location data for admin panel
      date: record.date
    }));
    
    res.status(200).json({
      success: true,
      data: formattedAttendance
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance records',
      error: error.message
    });
  }
};
