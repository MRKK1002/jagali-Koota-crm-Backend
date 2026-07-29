const mongoose = require("mongoose");

const documentCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction", "both", "common"],
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentCategory",
    },
    icon: String,
    color: String,
    // Access Control
    defaultPermissions: {
      canView: { type: Boolean, default: true },
      canDownload: { type: Boolean, default: true },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canShare: { type: Boolean, default: false },
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    // Retention & Compliance
    defaultRetentionPeriod: {
      type: Number, // in months
    },
    isConfidential: {
      type: Boolean,
      default: false,
    },
    allowedFileTypes: [String], // e.g., ['pdf', 'doc', 'docx']
    maxFileSize: {
      type: Number, // in bytes
      default: 10485760, // 10MB
    },
    versioningEnabled: {
      type: Boolean,
      default: true,
    },
    // Statistics
    documentCount: {
      type: Number,
      default: 0,
    },
    totalSize: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// code index is automatically created by unique: true constraint
documentCategorySchema.index({ businessType: 1, isActive: 1 });
documentCategorySchema.index({ parentCategory: 1 });

// Static method to get category hierarchy
documentCategorySchema.statics.getCategoryHierarchy = async function (
  businessType
) {
  const query = {
    isActive: true,
  };

  if (businessType && businessType !== "all") {
    query.$or = [{ businessType }, { businessType: "both" }];
  }

  const categories = await this.find(query).sort({ order: 1, name: 1 });

  const buildTree = (parentId = null) => {
    return categories
      .filter((cat) => {
        const parent = cat.parentCategory ? cat.parentCategory.toString() : null;
        return parent === parentId;
      })
      .map((cat) => ({
        ...cat.toObject(),
        children: buildTree(cat._id.toString()),
      }));
  };

  return buildTree();
};

module.exports = mongoose.model("DocumentCategory", documentCategorySchema);


