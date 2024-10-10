const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

const TeamSchema = new Schema(
  {
    teamNumber: { type: Number, required: true, unique: true }, 
    teamName: { type: String, required: true, unique: true }, 
    territory: { type: mongoose.Types.ObjectId, ref: DB_Tables.Territory},
    flws: [{ type: mongoose.Types.ObjectId, ref:DB_Tables.USER }], 
    aic: { type: mongoose.Types.ObjectId, ref:DB_Tables.USER }, 
    ucmo: { type: mongoose.Types.ObjectId, ref:DB_Tables.USER }, 
    createdBy: { type: mongoose.Types.ObjectId, ref:DB_Tables.USER }, 

  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", TeamSchema);
