const mongoose = require("mongoose");
const { Schema } = mongoose;
const { DB_Tables } = require("../utils/enum");

const TerritorySchema = new Schema(
  {
    district: {type: mongoose.Schema.Types.ObjectId, ref: DB_Tables.DISTRICT},
    division: {type: mongoose.Schema.Types.ObjectId, ref: DB_Tables.DIVISION},
    uc: {type: mongoose.Schema.Types.ObjectId, ref: DB_Tables.UC},
    townOrTehsil: {type: mongoose.Schema.Types.ObjectId, ref: DB_Tables.TEHSIL}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Territory", TerritorySchema);
