const express = require('express');
const router = express.Router();
const {
    markAttendance,
    getAllAttendance,
    getAttendanceById ,
    updateAttendance,
    getAttendanceByEmployee
} = require('../controller/attendanceControllerConstruction');

router.post('/', markAttendance);
router.get('/:id',getAttendanceById);
router.get('/', getAllAttendance);
router.put('/:id', updateAttendance);
router.get('/employee/:employeeId', getAttendanceByEmployee);
module.exports = router;
