// // controllers/newRecipeRequirementController.js
// const NewRecipeRequirement = require("../model/NewRecipeRequirement");

// // Create a new recipe requirement
// exports.createRecipeRequirement = async (req, res) => {
//   try {
//     const recipe = await NewRecipeRequirement.create(req.body);
//     res.status(201).json(recipe);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // Get all recipe requirements
// exports.getAllRecipeRequirements = async (req, res) => {
//   try {
//     const recipes = await NewRecipeRequirement.find()
//       .populate("branchId", "name address")
//       .populate("categoryId", "name")
//       .populate("productId", "name price")
//       .populate("items.rawMaterial", "name unit price");
//     res.json(recipes);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get single recipe requirement by ID
// exports.getRecipeRequirementById = async (req, res) => {
//   try {
//     const recipe = await NewRecipeRequirement.findById(req.params.id)
//       .populate("branchId", "name address")
//       .populate("categoryId", "name")
//       .populate("productId", "name price")
//       .populate("items.rawMaterial", "name unit price");

//     if (!recipe) return res.status(404).json({ message: "Recipe not found" });

//     res.json(recipe);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Update recipe requirement
// exports.updateRecipeRequirement = async (req, res) => {
//   try {
//     const recipe = await NewRecipeRequirement.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     );

//     if (!recipe) return res.status(404).json({ message: "Recipe not found" });

//     res.json(recipe);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // Delete recipe requirement
// exports.deleteRecipeRequirement = async (req, res) => {
//   try {
//     const recipe = await NewRecipeRequirement.findByIdAndDelete(req.params.id);

//     if (!recipe) return res.status(404).json({ message: "Recipe not found" });

//     res.json({ message: "Recipe deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// controllers/newRecipeRequirementController.js
  const NewRecipeRequirement = require("../model/NewRecipeRequirement");

  // Create a new recipe requirement
 // Create a new recipe requirement - UPDATED
exports.createRecipeRequirement = async (req, res) => {
  try {
    const session = await NewRecipeRequirement.startSession();
    session.startTransaction();

    const recipe = await NewRecipeRequirement.create([req.body], { session });
    const created = Array.isArray(recipe) ? recipe[0] : recipe;

    // Consume inventory per item
    const ResStock = require("../model/ResStockModel");
    for (const item of (req.body.items || [])) {
      if (!item.rawMaterial || !item.quantity) continue;
      const stockDoc = await ResStock.findOne({ rawMaterial: item.rawMaterial }).session(session);
      if (!stockDoc) continue; // skip if no stock record
      const newRemaining = Math.max(0, (stockDoc.remainingStock || 0) - Number(item.quantity));
      stockDoc.remainingStock = newRemaining;
      stockDoc.totalQuantityPurchased = Math.max(stockDoc.totalQuantityPurchased || 0, newRemaining); // keep invariant
      // Update status based on minLevel
      const minLevel = stockDoc.minLevel || 0;
      stockDoc.status = newRemaining <= 0 ? 'OUT' : (newRemaining <= minLevel ? 'LOW' : 'OK');
      stockDoc.stockLocationHistory.push({ location: req.body.branchName || 'Kitchen', quantity: -Math.abs(Number(item.quantity)) });
      await stockDoc.save({ session });
    }

    await session.commitTransaction();
    session.endSession();
    res.status(201).json(created);
  } catch (error) {
    try { await session?.abortTransaction(); session?.endSession(); } catch (_) {}
    res.status(400).json({ message: error.message });
  }
};

// Get all recipe requirements - UPDATED
exports.getAllRecipeRequirements = async (req, res) => {
  try {
    const recipes = await NewRecipeRequirement.find()
      .populate("items.rawMaterial", "name unit");
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

  // Get single recipe requirement by ID
  exports.getRecipeRequirementById = async (req, res) => {
    try {
      const recipe = await NewRecipeRequirement.findById(req.params.id)
        .populate("productId", "itemName description prices image")
        .populate("items.rawMaterial", "name unit");

      if (!recipe) return res.status(404).json({ message: "Recipe not found" });

      res.json(recipe);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  // Update recipe requirement
  exports.updateRecipeRequirement = async (req, res) => {
    try {
      const recipe = await NewRecipeRequirement.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate("productId", "itemName description prices image")
      .populate("items.rawMaterial", "name unit");

      if (!recipe) return res.status(404).json({ message: "Recipe not found" });

      res.json(recipe);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };

  // Delete recipe requirement
  exports.deleteRecipeRequirement = async (req, res) => {
    try {
      const recipe = await NewRecipeRequirement.findByIdAndDelete(req.params.id);

      if (!recipe) return res.status(404).json({ message: "Recipe not found" });

      res.json({ message: "Recipe deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };