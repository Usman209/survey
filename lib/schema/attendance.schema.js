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
      // Changed from `deviceTime` to `attendanceTimeStamp`
      attendanceTimeStamp: {
        type: Date,
        required: false,
      },
      userId: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
      attendanceTime: {
        type: String,
        required: false,
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
        required: false,
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
        required: false,
      },
      startTime: {
        type: String,
        required: false,
      },
      endTime: {
        type: String,
        required: false,
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
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", AttendanceSchema);
