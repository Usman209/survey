const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the Trsite schema
const trsiteSchema = new Schema(
  {
    data: { type: mongoose.Schema.Types.Mixed, required: true },  // Store raw JSON data
    addedAt: { type: Date, default: Date.now },  // Timestamp for document creation
    updatedAt: { type: Date, default: Date.now },  // Timestamp for last update
    isProcessed: { type: Boolean, default: false },  // Flag to track processing status
    user: {
      id: { type: mongoose.Types.ObjectId, ref: 'User' },  // User ID reference
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
trsiteSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = trsiteSchema;
