const request = require('supertest');
const express = require('express');
const app = express();

app.get('/api/branch', (req, res) => {
    res.status(404).send();
});

test('GET /api/branch should return 404', async () => {
    const response = await request(app).get('/api/branch');
    expect(response.status).toBe(404);
});