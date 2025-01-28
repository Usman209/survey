const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

const TeamSchema = new Schema(
  {
    teamNumber: { type: Number },
    teamName: { type: String, required: true, unique: true },
    territory: {
      district: { type: String, required: true },
      division: { type: String, required: true },
      uc: { type: String, required: true },
      tehsilOrTown: { type: String, required: true },
    },
    flws: [{ type: mongoose.Types.ObjectId, ref: DB_Tables.USER }],
    aic: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    ucmo: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    createdBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    updatedBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    siteType: { type: String },
    // siteType: { type: String, enum: ['Trsite', 'Fixed'], },


    location: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", TeamSchema);
