const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

// Define the CollectedData schema
const CollectedDataSchema = new Schema(
  {
    flwId: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    teamId: { type: mongoose.Types.ObjectId, ref: 'Team' },
    teamNumber: { type: String, required: true }, // Add teamNumber field
    campaignName: { type: String, required: true }, // Add campaignName field
    submissions: [
      {
        data: { type: Object, required: true }, // The collected data
        submittedAt: { type: Date, default: Date.now }, // Submission date
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CollectedData", CollectedDataSchema);
