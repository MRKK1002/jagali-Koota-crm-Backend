const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.FACE_TEST_MODE = 'true';

const app = require('../server');
const Employee = require('../model/Employee');
const AttendanceRecord = require('../model/AttendanceRecord');
const AttendanceMaster = require('../model/AttendanceMaster');
const SalarySlip = require('../model/SalarySlip');

describe('HRMS face flow', () => {
  beforeAll(async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set for tests');
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('register -> punch-in -> punch-out -> salary slip', async () => {
    // Clean test data
    await Employee.deleteMany({ email: 'test.user@example.com' });
    await AttendanceRecord.deleteMany({});
    await AttendanceMaster.deleteMany({});
    await SalarySlip.deleteMany({});

    // Prepare a tiny image file for upload
    const imgPath = path.join(__dirname, 'tiny.png');
    fs.writeFileSync(
      imgPath,
      Buffer.from([
        0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
        0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,0xDE,
        0x00,0x00,0x00,0x0C,0x49,0x44,0x41,0x54,0x08,0xD7,0x63,0xF8,0x0F,0x00,0x00,0x01,0x00,
        0x01,0x00,0x18,0xDD,0x8D,0x89,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,0x42,0x60,0x82
      ])
    );

    // 1) Register employee with face
    const regRes = await request(app)
      .post('/api/v1/hrms/register-employee')
      .field('name', 'Test User')
      .field('email', 'test.user@example.com')
      .field('phone', '9999999999')
      .field('joiningDate', new Date().toISOString())
      .field('salary', '30000')
      .field('department', 'IT')
      .field('position', 'Engineer')
      .field('businessType', 'restaurant')
      .attach('faceImage', imgPath);

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    const employeeId = regRes.body.data.employee.id;

    // 2) Punch in
    const inRes = await request(app)
      .post('/api/v1/hrms/punch-in')
      .attach('faceImage', imgPath);
    expect(inRes.status).toBe(200);
    expect(inRes.body.success).toBe(true);

    // 3) Punch out
    const outRes = await request(app)
      .post('/api/v1/hrms/punch-out')
      .attach('faceImage', imgPath);
    expect(outRes.status).toBe(200);
    expect(outRes.body.success).toBe(true);

    // 4) Generate salary slip
    const now = new Date();
    const genRes = await request(app)
      .post('/api/v1/hrms/generate-salary-slip')
      .send({ employeeId, month: now.getMonth() + 1, year: now.getFullYear() });
    expect(genRes.status).toBe(201);
    expect(genRes.body.success).toBe(true);

    // cleanup file
    fs.unlinkSync(imgPath);
  });
});


