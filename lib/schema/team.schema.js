const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

const TeamSchema = new Schema(
  {
    teamNumber: { type: Number, required: true, unique: true }, // Unique team number
    teamName: { type: String, required: true, unique: true }, // Ensure teamName is unique
    flws: [{ type: mongoose.Types.ObjectId, ref:DB_Tables.USER }], // Reference to the FLWs in the team
    createdBy: { type: mongoose.Types.ObjectId, ref:DB_Tables.USER }, // Reference to the admin who created the team
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", TeamSchema);
