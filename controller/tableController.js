const Table = require("../Restaurant/RestautantModel/RestaurantTabelModel");
const RestaurantProfile = require("../Restaurant/RestautantModel/RestaurantProfileModel");
const asyncHandler = require("express-async-handler");
const fs = require("fs");
const path = require("path");

const createTable = asyncHandler(async (req, res) => {
  if (!req.body) {
    res.status(400);
    throw new Error("Request body is missing");
  }

  const { branchId, number, status } = req.body;
  const image = req.file ? req.file.path : null;

  if (!branchId || !number) {
    res.status(400);
    throw new Error("Branch ID and number are required");
  }

  const restaurant = await RestaurantProfile.findById(branchId);
  if (!restaurant) {
    res.status(404);
    throw new Error("Restaurant branch not found");
  }

  const table = new Table({ branchId, number, status, image });
  const createdTable = await table.save();

  // Add this: Populate branchId to match getTables response
  await createdTable.populate("branchId", "branchName restaurantName");

  res.status(201).json(createdTable);
});

const getTables = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const query = branchId ? { branchId } : {};
  const tables = await Table.find(query).populate("branchId", "branchName restaurantName gstNumber address contact").sort({ number: 1 });
  res.json(tables);
});

const getTableById = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id).populate(
    "branchId",
    "branchName restaurantName"
  );

  if (table) {
    res.json(table);
  } else {
    res.status(404);
    throw new Error("Table not found");
  }
});

const updateTable = asyncHandler(async (req, res) => {
  if (!req.body) {
    res.status(400);
    throw new Error("Request body is missing");
  }

  const { branchId, number, status } = req.body;
  const updateData = { branchId, number, status };

  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  if (req.file) {
    updateData.image = req.file.path;

    const table = await Table.findById(req.params.id);
    if (table && table.image) {
      const oldImagePath = path.join(__dirname, "..", table.image);
      fs.unlink(oldImagePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error("Error deleting old image:", err);
        }
        // ENOENT error means file doesn't exist, which is fine
      });
    }
  }

  if (updateData.branchId) {
    const restaurant = await RestaurantProfile.findById(updateData.branchId);
    if (!restaurant) {
      res.status(404);
      throw new Error("Restaurant branch not found");
    }
  }

  const updatedTable = await Table.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("branchId", "branchName restaurantName");

  if (!updatedTable) {
    res.status(404);
    throw new Error("Table not found");
  }

  res.json(updatedTable);
});

const deleteTable = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id);

  if (!table) {
    res.status(404);
    throw new Error("Table not found");
  }

  if (table.image) {
    const imagePath = path.join(__dirname, "..", table.image);
    fs.unlink(imagePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error("Error deleting image:", err);
      }
      // ENOENT error means file doesn't exist, which is fine
    });
  }

  await Table.deleteOne({ _id: req.params.id });
  res.json({ message: "Table removed successfully" });
});

module.exports = {
  createTable,
  getTables,
  getTableById,
  updateTable,
  deleteTable,
};

// const Table = require("../model/Table");
// const Branch = require("../model/Branch");
// const asyncHandler = require("express-async-handler");
// const fs = require("fs");
// const path = require("path");

// const createTable = asyncHandler(async (req, res) => {
//   try {
//     if (!req.body) {
//       return res.status(400).json({ message: "Request body is missing" });
//     }

//     const { branchId, number, status } = req.body;
//     const image = req.file ? req.file.path : null;

//     console.log("Creating table with data:", {
//       branchId,
//       number,
//       status,
//       image,
//     });

//     if (!branchId || !number) {
//       return res
//         .status(400)
//         .json({ message: "Branch ID and number are required" });
//     }

//     // Check if table number already exists in the same branch
//     const existingTable = await Table.findOne({ branchId, number });
//     if (existingTable) {
//       return res.status(400).json({
//         message: `Table number ${number} already exists in this branch`,
//       });
//     }

//     const branch = await Branch.findById(branchId);
//     if (!branch) {
//       return res.status(404).json({ message: "Branch not found" });
//     }

//     const table = new Table({
//       branchId,
//       number: parseInt(number),
//       status: status || "available",
//       image,
//     });

//     const createdTable = await table.save();
//     await createdTable.populate("branchId", "name");

//     console.log("Table created successfully:", createdTable);
//     res.status(201).json(createdTable);
//   } catch (error) {
//     console.error("Error creating table:", error);
//     res.status(500).json({
//       message: "Error creating table",
//       error: error.message,
//     });
//   }
// });

// const getTables = asyncHandler(async (req, res) => {
//   try {
//     const { branchId } = req.query;
//     const query = branchId ? { branchId } : {};
//     const tables = await Table.find(query)
//       .populate("branchId")
//       .sort({ number: 1 });

//     res.json(tables);
//   } catch (error) {
//     console.error("Error fetching tables:", error);
//     res.status(500).json({
//       message: "Error fetching tables",
//       error: error.message,
//     });
//   }
// });

// const getTableById = asyncHandler(async (req, res) => {
//   try {
//     const table = await Table.findById(req.params.id).populate(
//       "branchId",
//       "name"
//     );

//     if (table) {
//       res.json(table);
//     } else {
//       res.status(404).json({ message: "Table not found" });
//     }
//   } catch (error) {
//     console.error("Error fetching table:", error);
//     res.status(500).json({
//       message: "Error fetching table",
//       error: error.message,
//     });
//   }
// });

// const updateTable = asyncHandler(async (req, res) => {
//   try {
//     if (!req.body) {
//       return res.status(400).json({ message: "Request body is missing" });
//     }

//     const { branchId, number, status } = req.body;
//     const updateData = { branchId, number, status };

//     // Remove undefined fields
//     Object.keys(updateData).forEach(
//       (key) => updateData[key] === undefined && delete updateData[key]
//     );

//     // Convert number to integer if provided
//     if (updateData.number) {
//       updateData.number = parseInt(updateData.number);
//     }

//     // Check for duplicate table number in the same branch (excluding current table)
//     if (updateData.branchId && updateData.number) {
//       const existingTable = await Table.findOne({
//         branchId: updateData.branchId,
//         number: updateData.number,
//         _id: { $ne: req.params.id },
//       });

//       if (existingTable) {
//         return res.status(400).json({
//           message: `Table number ${updateData.number} already exists in this branch`,
//         });
//       }
//     }

//     if (req.file) {
//       updateData.image = req.file.path;

//       // Delete old image if exists
//       const table = await Table.findById(req.params.id);
//       if (table && table.image) {
//         const oldImagePath = path.join(__dirname, "..", table.image);
//         if (fs.existsSync(oldImagePath)) {
//           fs.unlink(oldImagePath, (err) => {
//             if (err) console.error("Error deleting old image:", err);
//           });
//         }
//       }
//     }

//     if (updateData.branchId) {
//       const branch = await Branch.findById(updateData.branchId);
//       if (!branch) {
//         return res.status(404).json({ message: "Branch not found" });
//       }
//     }

//     const updatedTable = await Table.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       {
//         new: true,
//         runValidators: true,
//       }
//     ).populate("branchId", "name");

//     if (!updatedTable) {
//       return res.status(404).json({ message: "Table not found" });
//     }

//     res.json(updatedTable);
//   } catch (error) {
//     console.error("Error updating table:", error);
//     res.status(500).json({
//       message: "Error updating table",
//       error: error.message,
//     });
//   }
// });

// const deleteTable = asyncHandler(async (req, res) => {
//   try {
//     const table = await Table.findById(req.params.id);

//     if (!table) {
//       return res.status(404).json({ message: "Table not found" });
//     }

//     // Delete image file if exists
//     if (table.image) {
//       const imagePath = path.join(__dirname, "..", table.image);
//       if (fs.existsSync(imagePath)) {
//         fs.unlink(imagePath, (err) => {
//           if (err) console.error("Error deleting image:", err);
//         });
//       }
//     }

//     await Table.deleteOne({ _id: req.params.id });
//     res.json({ message: "Table removed successfully" });
//   } catch (error) {
//     console.error("Error deleting table:", error);
//     res.status(500).json({
//       message: "Error deleting table",
//       error: error.message,
//     });
//   }
// });

// module.exports = {
//   createTable,
//   getTables,
//   getTableById,
//   updateTable,
//   deleteTable,
// };
