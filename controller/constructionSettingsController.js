const ConstructionInvoiceSettings = require("../model/ConstructionInvoiceSettings")
const ConstructionInvoiceTemplate = require("../model/ConstructionInvoiceTemplate")
const asyncHandler = require("express-async-handler")

// @desc    Get construction invoice settings
// @route   GET /api/construction/sales/invoice-settings
// @access  Private
const getConstructionInvoiceSettings = asyncHandler(async (req, res) => {
  let settings = await ConstructionInvoiceSettings.findOne()

  if (!settings) {
    // Create default construction settings if none exist
    settings = await ConstructionInvoiceSettings.create({
      prefix: "SAL",
      nextNumber: 1,
      taxRate: 18,
      taxId: "GSTIN123456789",
      companyName: "Your Construction Company Name",
      companyAddress: "Your Construction Company Address",
      companyGSTIN: "Your Construction Company GSTIN",
      companyState: "Your State",
    })
  }

  res.json(settings)
})

// @desc    Update construction invoice settings
// @route   POST /api/construction/sales/invoice-settings
// @access  Private
const updateConstructionInvoiceSettings = asyncHandler(async (req, res) => {
  let settings = await ConstructionInvoiceSettings.findOne()

  if (settings) {
    // Update existing construction settings
    Object.assign(settings, req.body)
    await settings.save()
  } else {
    // Create new construction settings
    settings = await ConstructionInvoiceSettings.create(req.body)
  }

  res.json(settings)
})

// @desc    Get all construction invoice templates
// @route   GET /api/construction/sales/invoice-templates
// @access  Private
const getConstructionInvoiceTemplates = asyncHandler(async (req, res) => {
  const templates = await ConstructionInvoiceTemplate.find({}).sort({ createdAt: -1 })
  res.json(templates)
})

// @desc    Get single construction invoice template
// @route   GET /api/construction/sales/invoice-templates/:id
// @access  Private
const getConstructionInvoiceTemplate = asyncHandler(async (req, res) => {
  const template = await ConstructionInvoiceTemplate.findById(req.params.id)

  if (!template) {
    res.status(404)
    throw new Error("Construction invoice template not found")
  }

  res.json(template)
})

// @desc    Create new construction invoice template
// @route   POST /api/construction/sales/invoice-templates
// @access  Private
const createConstructionInvoiceTemplate = asyncHandler(async (req, res) => {
  const { name, status, templateData } = req.body

  // Check if construction template name already exists
  const templateExists = await ConstructionInvoiceTemplate.findOne({ name })
  if (templateExists) {
    res.status(400)
    throw new Error("Construction invoice template with this name already exists")
  }

  const template = await ConstructionInvoiceTemplate.create({
    name,
    status: status || "Inactive",
    templateData: templateData || {},
  })

  res.status(201).json(template)
})

// @desc    Update construction invoice template
// @route   PUT /api/construction/sales/invoice-templates/:id
// @access  Private
const updateConstructionInvoiceTemplate = asyncHandler(async (req, res) => {
  const template = await ConstructionInvoiceTemplate.findById(req.params.id)

  if (!template) {
    res.status(404)
    throw new Error("Construction invoice template not found")
  }

  const updatedTemplate = await ConstructionInvoiceTemplate.findByIdAndUpdate(
    req.params.id,
    { ...req.body, lastModified: new Date() },
    { new: true, runValidators: true },
  )

  res.json(updatedTemplate)
})

// @desc    Activate construction invoice template
// @route   PATCH /api/construction/sales/invoice-templates/:id/activate
// @access  Private
const activateConstructionInvoiceTemplate = asyncHandler(async (req, res) => {
  const template = await ConstructionInvoiceTemplate.findById(req.params.id)

  if (!template) {
    res.status(404)
    throw new Error("Construction invoice template not found")
  }

  // Deactivate all other construction templates
  await ConstructionInvoiceTemplate.updateMany({ _id: { $ne: req.params.id } }, { status: "Inactive" })

  // Activate this construction template
  template.status = "Active"
  template.lastModified = new Date()
  await template.save()

  res.json(template)
})

// @desc    Delete construction invoice template
// @route   DELETE /api/construction/sales/invoice-templates/:id
// @access  Private
const deleteConstructionInvoiceTemplate = asyncHandler(async (req, res) => {
  const template = await ConstructionInvoiceTemplate.findById(req.params.id)

  if (!template) {
    res.status(404)
    throw new Error("Construction invoice template not found")
  }

  if (template.status === "Active") {
    res.status(400)
    throw new Error("Cannot delete active construction invoice template")
  }

  await ConstructionInvoiceTemplate.findByIdAndDelete(req.params.id)

  res.json({ message: "Construction invoice template deleted successfully" })
})

// @desc    Get active construction invoice template
// @route   GET /api/construction/sales/invoice-templates/active
// @access  Private
const getActiveConstructionInvoiceTemplate = asyncHandler(async (req, res) => {
  const template = await ConstructionInvoiceTemplate.findOne({ status: "Active" })

  if (!template) {
    res.status(404)
    throw new Error("No active construction invoice template found")
  }

  res.json(template)
})

module.exports = {
  getConstructionInvoiceSettings,
  updateConstructionInvoiceSettings,
  getConstructionInvoiceTemplates,
  getConstructionInvoiceTemplate,
  createConstructionInvoiceTemplate,
  updateConstructionInvoiceTemplate,
  activateConstructionInvoiceTemplate,
  deleteConstructionInvoiceTemplate,
  getActiveConstructionInvoiceTemplate,
}
