// models/Division.js
const mongoose = require("mongoose");
const { DB_Tables } = require("../utils/enum");
const { Schema } = mongoose;

const DivisionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Division", DivisionSchema);


