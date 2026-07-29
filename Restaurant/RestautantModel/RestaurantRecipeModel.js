

const mongoose = require("mongoose")

const recipeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    menu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    cooking_time: {
      type: Number,
      required: true,
    },
    servings: {
      type: Number,
      required: true,
    },
    cost_per_serving: {
      type: Number,
      required: true,
    },
    ingredients: [
      {
        rawMaterialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RawMaterial",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          required: true,
        },
      },
    ],
    instructions: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
)

// Prevent model overwrite error
module.exports = mongoose.models.Recipe || mongoose.model("Recipe", recipeSchema)
