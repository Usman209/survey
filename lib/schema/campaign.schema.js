const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;
const CampaignSchema = new Schema(
  {
    campaignName: { type: String, required: true },
    numberOfDays: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    campaignType: {
      type: String,
      required: true,
      enum: ['SNID', 'NID', 'OBR', 'CR'],
    },
    createdBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    updatedBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    updatedBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },

    status: { 
      type: String, 
      required: true, 
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'INACTIVE' 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", CampaignSchema); 