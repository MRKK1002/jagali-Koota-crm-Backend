const express = require('express');
const router = express.Router();
const axios = require('axios');

// Base URL for HotelVirat production server
const HOTEL_VIRAT_BASE_URL = 'https://hotelvirat.com/api/v1/hotel';

// Proxy route for rooms - fetches from HotelViratAws /hotel/room
router.get('/rooms', async (req, res) => {
  try {
    console.log('🏨 Fetching rooms from HotelVirat production server...');
    
    // Forward the request to HotelVirat production server
    const response = await axios.get(`${HOTEL_VIRAT_BASE_URL}/room`, {
      params: req.query,
      timeout: 15000
    });
    
    console.log('✅ Successfully fetched rooms from HotelVirat:', response.data.length || 0);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching rooms from HotelVirat:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        message: 'HotelVirat production server is not reachable. Please check your internet connection.',
        error: 'Service unavailable'
      });
    }
    
    res.status(error.response?.status || 500).json({ 
      message: 'Failed to fetch rooms from HotelVirat production server',
      error: error.message 
    });
  }
});

// Proxy route for room bookings - fetches from HotelViratAws /hotel/room-booking
router.get('/room-booking', async (req, res) => {
  try {
    console.log('🏨 Fetching room bookings from HotelVirat production server...');
    
    // Forward the request to HotelVirat production server
    const response = await axios.get(`${HOTEL_VIRAT_BASE_URL}/room-booking`, {
      params: req.query,
      timeout: 15000
    });
    
    console.log('✅ Successfully fetched room bookings from HotelVirat:', response.data.length || 0);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching room bookings from HotelVirat:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        message: 'HotelVirat production server is not reachable. Please check your internet connection.',
        error: 'Service unavailable'
      });
    }
    
    res.status(error.response?.status || 500).json({ 
      message: 'Failed to fetch room bookings from HotelVirat production server',
      error: error.message 
    });
  }
});

// Proxy route for tables - fetches from HotelVirat /hotel/table
router.get('/tables', async (req, res) => {
  try {
    console.log('🍽️ Fetching tables from HotelVirat production server...');
    
    // Forward the request to HotelVirat production server
    const response = await axios.get(`${HOTEL_VIRAT_BASE_URL}/table`, {
      params: req.query,
      timeout: 15000
    });
    
    console.log('✅ Successfully fetched tables from HotelVirat:', response.data.length || 0);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching tables from HotelVirat:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        message: 'HotelVirat production server is not reachable. Please check your internet connection.',
        error: 'Service unavailable'
      });
    }
    
    res.status(error.response?.status || 500).json({ 
      message: 'Failed to fetch tables from HotelVirat production server',
      error: error.message 
    });
  }
});

module.exports = router;