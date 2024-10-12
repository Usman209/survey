// models/Tehsil.js
const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

const TehsilORTown = new Schema(
  {
    name: { type: String, required: true, unique: true }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("TehsilORTown", TehsilORTown);
