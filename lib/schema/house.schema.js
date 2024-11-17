const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the House schema with `Mixed` type for raw JSON data
const houseSchema = new mongoose.Schema(
  {
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Store raw JSON data
    campaignId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Campaign ID
    addedAt: { type: Date, default: Date.now }, // Timestamp for document creation
    updatedAt: { type: Date, default: Date.now }, // Timestamp for last update
    user: {
      id: { type: mongoose.Types.ObjectId, ref: 'User' }, // User ID reference
      name: { type: String, required: true },
      role: { type: String, required: true },
      UC: { type: String, required: true },
      UCMOName: { type: String, required: true },
      AICName: { type: String, required: true },
      teamNumber: { type: String, required: true },
      day: { type: String, required: true },
      date: { type: String, required: true },
      areaName: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// Set up a pre-save hook to update `updatedAt` whenever the document is updated
houseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const streetChildrenSchema = new mongoose.Schema(
  {
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Store raw JSON data
    campaignId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Campaign ID
    addedAt: { type: Date, default: Date.now }, // Timestamp for document creation
    updatedAt: { type: Date, default: Date.now }, // Timestamp for last update
    user: {
      id: { type: mongoose.Types.ObjectId, ref: 'User' }, // User ID reference
      name: { type: String, required: true },
      role: { type: String, required: true },
      UC: { type: String, required: true },
      UCMOName: { type: String, required: true },
      AICName: { type: String, required: true },
      teamNumber: { type: String, required: true },
      day: { type: String, required: true },
      date: { type: String, required: true },
      areaName: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// Set up a pre-save hook to update `updatedAt` whenever the document is updated
streetChildrenSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// School schema with raw JSON data
const schoolSchema = new mongoose.Schema(
  {
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Store raw JSON data
    campaignId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Campaign ID
    addedAt: { type: Date, default: Date.now }, // Timestamp for document creation
    updatedAt: { type: Date, default: Date.now }, // Timestamp for last update
    user: {
      id: { type: mongoose.Types.ObjectId, ref: 'User' }, // User ID reference
      name: { type: String, required: true },
      role: { type: String, required: true },
      UC: { type: String, required: true },
      UCMOName: { type: String, required: true },
      AICName: { type: String, required: true },
      teamNumber: { type: String, required: true },
      day: { type: String, required: true },
      date: { type: String, required: true },
      areaName: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// Set up a pre-save hook to update `updatedAt` whenever the document is updated
schoolSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});


module.exports = schoolSchema;

