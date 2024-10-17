const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

// Define the CollectedData schema
const CollectedDataSchema = new Schema(
  {
    flwId: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER, required: true },
    teamId: { type: mongoose.Types.ObjectId, ref: 'Team', required: true }, 
    data: { 
      type: Object, 
      required: true 
    },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CollectedData", CollectedDataSchema);
