const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

// Define the Campaign Schema
const CampaignSchema = new Schema(
  {
    campaignName: { 
      type: String, 
      required: true, 
      unique: true  // Unique at the application level
    },

    campaignDescription: { type: String }, 
    campaignNameSlug: { type: String },

    startDate: { type: String, required: true },
    endDate: { type: String, required: true },

    campaignType: {
      type: String,
      required: true,
      enum: ['SNID', 'NID', 'OBR', 'CR'],
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
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
