const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

const CampaignSchema = new Schema(
  {
    campaignName: { type: String, required: true },
    numberOfDays: { type: Number, required: true },
    dateCreated: { type: Date, default: Date.now },
    areaName: { type: String, required: true },
    assignedTeam: [{ type: mongoose.Types.ObjectId, ref: DB_Tables.TEAM }],
    createdBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", CampaignSchema);
