const mongoose = require("mongoose");
const { Schema } = mongoose;
const { DB_Tables } = require("../utils/enum");

const AttendanceSchema = new Schema(
  {

    userData: {
      userLocation: {
        latitude: { type: Number, required: true }, 
        longitude: { type: Number, required: true },
      },
      deviceTime: {
        type: Date,
        required: true,
      },
      userId: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
      attendanceTime: {
        type: String,
        required: true,
      },
      attendanceDate: {
        type: String,
      },

      userUc: {
        type: String,
      },

      extraInfo: {
        type: Schema.Types.Mixed,
        default: {},
      },

    },
    qrCodeData: {
      locationName: {
        type: String,
        required: true,
      },
      QrUc: {
        type: String,
      },
      location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        default: "campinge", 
      },

      extraInfo: {
        type: Schema.Types.Mixed, 
        default: {},
      },
    },

    remarks: {
      type: String,
      default: "",
    },

    slug: {
      type: String,
      default: "",
    },

    extraInfo: {
      type: Schema.Types.Mixed, // This allows you to store any kind of additional data in JSON format
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", AttendanceSchema);
