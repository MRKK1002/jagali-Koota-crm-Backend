const axios = require('axios');

const API_BASE = 'http://localhost:5000';

const testUOMAPI = async () => {
  console.log('🧪 Testing UOM API endpoints...\n');

  try {
    // Test GET /UOM
    console.log('1️⃣ Testing GET /UOM');
    const getResponse = await axios.get(`${API_BASE}/UOM`);
    console.log('✅ GET /UOM successful');
    console.log('📊 Status:', getResponse.status);
    console.log('📦 Data:', getResponse.data);
    console.log('📋 UOM Count:', getResponse.data.data?.length || 0);
    console.log('');

    // If no UOMs exist, create a test one
    if (!getResponse.data.data || getResponse.data.data.length === 0) {
      console.log('2️⃣ No UOMs found, creating test UOM...');
      const createResponse = await axios.post(`${API_BASE}/UOM`, {
        label: 'Kilogram',
        unit: 'kg'
      });
      console.log('✅ POST /UOM successful');
      console.log('📊 Status:', createResponse.status);
      console.log('📦 Created UOM:', createResponse.data);
      console.log('');

      // Test GET again
      console.log('3️⃣ Testing GET /UOM again after creation');
      const getResponse2 = await axios.get(`${API_BASE}/UOM`);
      console.log('✅ GET /UOM successful');
      console.log('📋 UOM Count:', getResponse2.data.data?.length || 0);
      console.log('');
    }

    console.log('🎉 All UOM API tests passed!');

  } catch (error) {
    console.error('❌ UOM API test failed:', error.message);
    if (error.response) {
      console.error('📄 Error response:', error.response.data);
      console.error('📊 Status:', error.response.status);
    }
  }
};

// Test Supplier API as well
const testSupplierAPI = async () => {
  console.log('\n🧪 Testing Supplier API endpoints...\n');

  try {
    // Test GET /api/v1/restaurant/supplier
    console.log('1️⃣ Testing GET /api/v1/restaurant/supplier');
    const getResponse = await axios.get(`${API_BASE}/api/v1/restaurant/supplier`);
    console.log('✅ GET /api/v1/restaurant/supplier successful');
    console.log('📊 Status:', getResponse.status);
    console.log('📦 Data structure:', {
      hasData: !!getResponse.data?.data,
      dataIsArray: Array.isArray(getResponse.data?.data),
      dataLength: getResponse.data?.data?.length,
      responseKeys: Object.keys(getResponse.data || {})
    });
    console.log('📋 Supplier Count:', getResponse.data.data?.length || 0);
    console.log('');

    console.log('🎉 Supplier API test passed!');

  } catch (error) {
    console.error('❌ Supplier API test failed:', error.message);
    if (error.response) {
      console.error('📄 Error response:', error.response.data);
      console.error('📊 Status:', error.response.status);
    }
  }
};

// Run tests
const runTests = async () => {
  await testUOMAPI();
  await testSupplierAPI();
  process.exit(0);
};

runTests();