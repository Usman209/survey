const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

// Define the CollectedData schema
const CollectedDataSchema = new Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    teamId: { type: mongoose.Types.ObjectId, ref: 'Team' },
    submissions: [
      {
        data: { type: Object }, // The collected data
        submittedAt: { type: Date, default: Date.now }, // Submission date
      },
    ],
    userData: {
      id: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
      firstName: { type: String },
      lastName: { type: String },
      cnic: { type: String },
      role: { type: String },
      needsPasswordReset: { type: Boolean }, // Change to Boolean if applicable
    },
    campaignDetails: {
      UC: { type: String },
      UCMOName: { type: String },
      AICName: { type: String },
      teamNumber: { type: String }, // Moved under campaignDetails
      campaignName: { type: String }, // Moved under campaignDetails
      day: { type: String },
      date: { type: String }, // You can change this to Date if preferred
      areaName: { type: String },
      campaignType: { type: String },
    },
    fixedSite: {
      name: { type: String, default: "" },
      age: { type: Number, default: null },
      address: { type: String, default: "" },
      vaccinated: { type: Boolean, default: false }, // Boolean field
    },
    Trsite: {
      name: { type: String, default: "" },
      age: { type: Number, default: null },
      travelFromLHRToOtherDistrict: { type: String, default: "" },
      travelFromOtherDistrictToLHR: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CollectedData", CollectedDataSchema);
