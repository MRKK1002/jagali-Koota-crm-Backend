// const mongoose = require('mongoose');

// const projectSchema = new mongoose.Schema({
//   projectName: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   clientId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Client',
//     required: true
//   },
//   location: {
//     type: String,
//     trim: true
//   },
//   startDate: {
//     type: Date
//   },
//   endDate: {
//     type: Date
//   },
//   budget: {
//     type: Number,
//     default: 0
//   },
//   status: {
//     type: String,
//     default: 'Active',
//     enum: ['Active', 'In Progress', 'Completed', 'On Hold']
//   },
//   description: {
//     type: String,
//     trim: true
//   },
//   projectManager: {
//     type: String,
//     trim: true
//   },
//   contactPerson: {
//     type: String,
//     trim: true
//   },
//   phone: {
//     type: String,
//     trim: true
//   },
//   email: {
//     type: String,
//     trim: true
//   }
// }, {
//   timestamps: true
// });

// // Virtual for formatted dates
// projectSchema.virtual('formattedStartDate').get(function() {
//   return this.startDate ? this.startDate.toISOString().split('T')[0] : '';
// });

// projectSchema.virtual('formattedEndDate').get(function() {
//   return this.endDate ? this.endDate.toISOString().split('T')[0] : '';
// });

// // Index for better query performance
// projectSchema.index({ clientId: 1 });
// projectSchema.index({ status: 1 });

// module.exports = mongoose.model('Project', projectSchema);


const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true, trim: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  location: String,
  startDate: Date,
  endDate: Date,
  budget: { type: Number, default: 0 },
  status: { type: String, default: 'Active', enum: ['Active', 'In Progress', 'Completed', 'On Hold'] },
  description: String,
  projectManager: String,
  contactPerson: String,
  phone: String,
  email: String,
  businessType: {
    type: String,
    enum: ['construction', 'restaurant'],
    default: 'construction'
  }
}, { timestamps: true });

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
