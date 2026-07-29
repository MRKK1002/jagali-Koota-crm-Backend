const mongoose = require("mongoose");
const RestaurantProfile = require("../RestautantModel/RestaurantProfileModel");
const Branch = require("../RestautantModel/RestaurantBranch");

// Helper function to convert Branch to Restaurant format
const branchToRestaurant = (branch) => {
  // Parse address if it's a string
  let addressData = {
    street: "",
    city: "",
    state: "",
    country: ""
  };
  
  if (typeof branch.address === 'string') {
    const parts = branch.address.split(',').map(p => p.trim());
    
    if (parts.length >= 3) {
      // Check if last part looks like a country
      const lastPart = parts[parts.length - 1];
      const isCountry = lastPart.length < 30 && !lastPart.match(/\d{6}/);
      
      if (isCountry) {
        // Format: "Street parts..., City, State, Country"
        addressData = {
          street: parts.slice(0, -3).join(', '),
          city: parts[parts.length - 3] || "",
          state: parts[parts.length - 2] || "",
          country: parts[parts.length - 1] || ""
        };
      } else {
        // Format: "Street parts..., City, State Pincode"
        addressData = {
          street: parts.slice(0, -2).join(', '),
          city: parts[parts.length - 2] || "",
          state: parts[parts.length - 1] || "",
          country: ""
        };
      }
    } else {
      addressData.street = branch.address;
    }
  } else if (branch.address) {
    addressData = branch.address;
  }
  
  return {
    _id: branch._id,
    branchName: branch.name,
    restaurantName: branch.name,
    gstNumber: branch.gstNumber || "",
    address: addressData,
    contact: branch.contact || {
      phone: "",
      email: "",
    },
    openingHours: branch.openingHours || {
      mondayToFriday: "11:00 AM - 11:00 PM",
      saturday: "11:00 AM - 12:00 AM",
      sunday: "12:00 PM - 10:00 PM",
    },
    image: branch.image,
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
  };
};

const getAllRestaurants = async (req, res) => {
  try {
    const { city, state, page = 1, limit, search, all } = req.query;

    console.log("getAllRestaurants called with params:", { city, state, page, limit, search, all });
    console.log("Query string:", req.url);
    console.log("All query params:", req.query);

    // Build filter object for restaurants
    const filter = {};
    if (city) filter["address.city"] = new RegExp(city, "i");
    if (state) filter["address.state"] = new RegExp(state, "i");

    // Search functionality
    if (search) {
      filter.$or = [
        { restaurantName: new RegExp(search, "i") },
        { branchName: new RegExp(search, "i") },
        { "contact.email": new RegExp(search, "i") },
        { "contact.phone": new RegExp(search, "i") },
      ];
    }

    // Check total count first
    const totalCount = await RestaurantProfile.countDocuments(filter);
    console.log(`Total restaurants in database (with filter): ${totalCount}`);

    // If 'all' parameter is true or limit is very high, return all restaurants
    const shouldReturnAll = all === 'true' || all === true || (limit && parseInt(limit) >= 1000);
    console.log(`shouldReturnAll check: all="${all}", type=${typeof all}, shouldReturnAll=${shouldReturnAll}`);
    
    let restaurants;
    let total;
    
    if (shouldReturnAll) {
      // Return all restaurants without pagination
      restaurants = await RestaurantProfile.find(filter)
        .sort({ createdAt: -1 });
      total = restaurants.length;
      console.log(`Returning all ${total} restaurants (no pagination)`);
      console.log(`Restaurant IDs:`, restaurants.map(r => ({ id: r._id, name: r.branchName || r.restaurantName })));
    } else {
      // Return paginated results
      const limitNum = limit ? parseInt(limit) : 10;
      restaurants = await RestaurantProfile.find(filter)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((parseInt(page) - 1) * limitNum);
      total = await RestaurantProfile.countDocuments(filter);
      console.log(`Returning ${restaurants.length} restaurants (paginated: page ${page}, limit ${limitNum})`);
    }

    // Also fetch branches and convert them to restaurant format
    const branches = await Branch.find({}).sort({ createdAt: -1 });
    const branchesAsRestaurants = branches.map(branchToRestaurant);
    console.log(`Found ${branches.length} branches to include`);

    // Merge restaurants and branches, removing duplicates based on _id
    const allData = [...restaurants];
    const existingIds = new Set(allData.map(r => r._id.toString()));
    
    branchesAsRestaurants.forEach(branch => {
      if (!existingIds.has(branch._id.toString())) {
        allData.push(branch);
      }
    });

    // Log sample data
    if (allData.length > 0) {
      console.log("Sample restaurant data:", allData[0].branchName || allData[0].restaurantName);
    } else {
      console.log("No restaurants found with current filter");
    }

    // Log all restaurant names for debugging
    console.log(`=== RESTAURANT FETCH SUMMARY ===`);
    console.log(`Total restaurants found: ${restaurants.length}`);
    console.log(`Total branches found: ${branches.length}`);
    console.log(`Total combined: ${allData.length}`);
    console.log(`Restaurant names:`, allData.map(r => r.branchName || r.restaurantName || 'Unnamed'));
    console.log(`Restaurant IDs:`, allData.map(r => r._id.toString()));
    console.log(`================================`);

    const responseData = {
      success: true,
      data: allData,
      pagination: shouldReturnAll ? null : {
        current: parseInt(page),
        pages: Math.ceil(total / (limit ? parseInt(limit) : 10)),
        total: allData.length,
      },
    };

    console.log(`Sending response with ${responseData.data.length} restaurants (including branches)`);
    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching restaurants",
      error: error.message,
    });
  }
};

// Get restaurant by ID
const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await RestaurantProfile.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching restaurant",
      error: error.message,
    });
  }
};

// Create new restaurant
const createRestaurant = async (req, res) => {
  try {
    let {
      branchName,
      restaurantName,
      gstNumber,
      address,
      contact,
      openingHours,
    } = req.body;

    // Parse JSON strings if they exist (from FormData)
    if (typeof address === 'string') {
      address = JSON.parse(address);
    }
    if (typeof contact === 'string') {
      contact = JSON.parse(contact);
    }
    if (typeof openingHours === 'string') {
      openingHours = JSON.parse(openingHours);
    }

    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Image file:", req.file);

    // Validate required fields
    if (!branchName || !gstNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: branchName and gstNumber are required",
        missingFields: {
          branchName: !branchName,
          gstNumber: !gstNumber,
        },
      });
    }

    // Validate address object
    if (!address || typeof address !== "object") {
      return res.status(400).json({
        success: false,
        message: "Address is required and must be an object",
      });
    }

    if (!address.street || !address.city || !address.state || !address.country) {
      return res.status(400).json({
        success: false,
        message: "Address must include street, city, state, and country",
        missingAddressFields: {
          street: !address.street,
          city: !address.city,
          state: !address.state,
          country: !address.country,
        },
      });
    }

    // Validate contact object
    if (!contact || typeof contact !== "object") {
      return res.status(400).json({
        success: false,
        message: "Contact is required and must be an object",
      });
    }

    if (!contact.phone || !contact.email) {
      return res.status(400).json({
        success: false,
        message: "Contact must include phone and email",
        missingContactFields: {
          phone: !contact.phone,
          email: !contact.email,
        },
      });
    }

    const restaurantData = {
      branchName,
      restaurantName: restaurantName || branchName, // Use branchName as fallback
      gstNumber,
      address,
      contact,
      openingHours,
    };

    // Add image if uploaded
    if (req.file) {
      restaurantData.image = `/uploads/branch/${req.file.filename}`;
    }

    // If _id is provided (from dual backend sync), use it
    if (req.body._id) {
      restaurantData._id = req.body._id;
      console.log("Using provided _id for sync:", req.body._id);
    }

    const restaurant = new RestaurantProfile(restaurantData);
    const savedRestaurant = await restaurant.save();

    // Also save to Branch model for compatibility with HotelViratAdminPanelFinal
    try {
      const addressString = [
        address.street,
        address.city,
        address.state,
        address.country
      ].filter(Boolean).join(", ");
      
      const branchData = {
        _id: savedRestaurant._id, // Use same _id
        name: branchName,
        gstNumber: gstNumber,
        address: addressString,
        contact: contact,
        openingHours: openingHours,
        image: restaurantData.image
      };
      
      const branch = new Branch(branchData);
      await branch.save();
      console.log("✅ Also saved to Branch model with same _id");
    } catch (branchError) {
      console.warn("⚠️ Failed to save to Branch model:", branchError.message);
      // Continue even if branch save fails
    }

    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      data: savedRestaurant,
    });
  } catch (error) {
    console.error("Error creating restaurant:", error);
    if (error.name === "ValidationError") {
      const validationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        validationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationErrors,
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating restaurant",
      error: error.message,
    });
  }
};

// Update restaurant
const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Parse JSON strings from FormData
    if (typeof updateData.address === 'string') {
      try {
        updateData.address = JSON.parse(updateData.address);
      } catch (e) {
        // Keep as string if not JSON
      }
    }
    if (typeof updateData.contact === 'string') {
      try {
        updateData.contact = JSON.parse(updateData.contact);
      } catch (e) {
        // Keep as string if not JSON
      }
    }
    if (typeof updateData.openingHours === 'string') {
      try {
        updateData.openingHours = JSON.parse(updateData.openingHours);
      } catch (e) {
        // Keep as string if not JSON
      }
    }

    // If branchName is provided but restaurantName is not, use branchName as restaurantName
    if (updateData.branchName && !updateData.restaurantName) {
      updateData.restaurantName = updateData.branchName;
    }

    // Handle image upload if a new file is provided
    if (req.file) {
      // Save relative path instead of absolute path
      updateData.image = req.file.path.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/');
      console.log('New image uploaded:', updateData.image);
    }

    const restaurant = await RestaurantProfile.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      data: restaurant,
    });
  } catch (error) {
    console.error("Error updating restaurant:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating restaurant",
      error: error.message,
    });
  }
};

// Delete restaurant
const deleteRestaurant = async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID format",
      });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database not available",
        error: "Cannot connect to MongoDB database",
      });
    }

    const restaurant = await RestaurantProfile.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    // Use deleteOne instead of findByIdAndDelete
    await RestaurantProfile.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting restaurant:", error);

    // Handle specific error types
    if (error.name === "MongoNetworkError") {
      return res.status(503).json({
        success: false,
        message: "Database connection error",
        error: "Cannot connect to MongoDB",
      });
    }

    if (error.name === "MongoTimeoutError") {
      return res.status(504).json({
        success: false,
        message: "Database operation timeout",
        error: "The operation took too long to complete",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting restaurant",
      error: error.message,
    });
  }
};

// Get restaurant statistics
const getRestaurantStats = async (req, res) => {
  try {
    const { state } = req.query;

    const filter = {};
    if (state) filter["address.state"] = new RegExp(state, "i");

    const stats = await RestaurantProfile.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$address.state",
          totalRestaurants: { $sum: 1 },
          cities: { $addToSet: "$address.city" },
        },
      },
      {
        $project: {
          state: "$_id",
          totalRestaurants: 1,
          numberOfCities: { $size: "$cities" },
          _id: 0,
        },
      },
      { $sort: { state: 1 } },
    ]);

    const total = await RestaurantProfile.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalRestaurants: total,
      },
    });
  } catch (error) {
    console.error("Error fetching restaurant stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching restaurant statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantStats,
};

