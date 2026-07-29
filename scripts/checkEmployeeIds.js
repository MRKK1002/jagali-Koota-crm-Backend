// Script to check and fix employee ID conflicts
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Employee = require('../Restaurant/RestautantModel/RestaurantEmployeeSchema');
const Sequence = require('../model/SequenceModel');

async function checkEmployeeIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/HotelVirat');
    console.log('Connected to MongoDB');

    // Check for duplicate employee IDs
    const duplicates = await Employee.aggregate([
      {
        $group: {
          _id: "$employeeId",
          count: { $sum: 1 },
          docs: { $push: "$$ROOT" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicates.length > 0) {
      console.log('\n🚨 Found duplicate employee IDs:');
      duplicates.forEach(dup => {
        console.log(`ID: ${dup._id}, Count: ${dup.count}`);
        dup.docs.forEach(doc => {
          console.log(`  - ${doc.name} (${doc._id})`);
        });
      });
    } else {
      console.log('✅ No duplicate employee IDs found');
    }

    // Check current sequence values
    const sequences = await Sequence.find({});
    console.log('\n📊 Current sequence values:');
    sequences.forEach(seq => {
      console.log(`${seq._id}: ${seq.sequence_value}`);
    });

    // Check highest employee ID for restaurant employees
    const restaurantEmployees = await Employee.find({ 
      businessType: 'restaurant',
      employeeId: { $regex: /^RES-\d{4}$/ }
    }).sort({ employeeId: -1 }).limit(5);

    console.log('\n🏪 Latest restaurant employee IDs:');
    restaurantEmployees.forEach(emp => {
      console.log(`${emp.employeeId} - ${emp.name}`);
    });

    // Get the highest number from existing IDs
    if (restaurantEmployees.length > 0) {
      const highestId = restaurantEmployees[0].employeeId;
      const highestNumber = parseInt(highestId.split('-')[1]);
      console.log(`\n📈 Highest restaurant employee number: ${highestNumber}`);
      
      // Check if sequence needs to be updated
      const restaurantSequence = await Sequence.findById('restaurant_employee_id');
      if (!restaurantSequence || restaurantSequence.sequence_value <= highestNumber) {
        console.log(`⚠️  Sequence needs update. Current: ${restaurantSequence?.sequence_value || 0}, Should be: ${highestNumber + 1}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

async function fixSequence() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/HotelVirat');
    console.log('Connected to MongoDB');

    // Get highest restaurant employee number
    const restaurantEmployees = await Employee.find({ 
      businessType: 'restaurant',
      employeeId: { $regex: /^RES-\d{4}$/ }
    }).sort({ employeeId: -1 }).limit(1);

    if (restaurantEmployees.length > 0) {
      const highestId = restaurantEmployees[0].employeeId;
      const highestNumber = parseInt(highestId.split('-')[1]);
      
      // Update sequence to be higher than existing IDs
      await Sequence.findByIdAndUpdate(
        'restaurant_employee_id',
        { sequence_value: highestNumber },
        { upsert: true }
      );
      
      console.log(`✅ Updated restaurant employee sequence to ${highestNumber}`);
      console.log(`Next employee ID will be: RES-${(highestNumber + 1).toString().padStart(4, '0')}`);
    }

  } catch (error) {
    console.error('Error fixing sequence:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the check
if (process.argv[2] === 'fix') {
  fixSequence();
} else {
  checkEmployeeIds();
}