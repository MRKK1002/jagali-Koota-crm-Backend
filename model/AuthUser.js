// const mongoose = require("mongoose");

// const authUserSchema = new mongoose.Schema(
//   {
//     email: { type: String, required: true, unique: true, lowercase: true },
//     password: { type: String, required: true },
//     type: {
//       type: String,
//       required: true,
//       enum: ["common", "construction", "restaurant"],
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("AuthUser", authUserSchema);




const mongoose = require("mongoose")

const authUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["common", "construction", "restaurant"],
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("AuthUser", authUserSchema)
