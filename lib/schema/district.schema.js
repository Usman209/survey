// models/District.js
const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

const DistrictSchema = new Schema(
  {
    name: { type: String, required: true, unique: true }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("District", DistrictSchema);
