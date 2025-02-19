const mongoose = require("mongoose");
const { Schema } = mongoose;
const { EUserRole, UserStatus, DeleteStatus, DB_Tables, UserGender } = require("../../lib/utils/enum");

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, trim: true, unique: true, lowercase: true },
    cnic: { type: String, required: true, unique: true, minlength: 13, maxlength: 13, index: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    contact: { type: String },
    designation: { type: String },
    status: { type: String, default: UserStatus.ACTIVE, enum: [UserStatus] },
    role: { type: String, enum: [EUserRole] },
    emailVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isFirstLogin: { type: Boolean, default: true },
    address: { street: String, city: String, state: String, zip: String, country: String },
    bio: { type: String },
    gender: { type: String, enum: [UserGender] },
    profileImg: { type: String },
    thumbnail: { type: String },
    lastLogin: { type: Date },
    qualifications: [{ degree: String, institution: String, year: Number }],
    team: { type: mongoose.Types.ObjectId, ref: DB_Tables.TEAM },
    territory: {
      division: { type: String },
      district: { type: String },
      uc: { type: String },
      tehsilOrTown: { type: String },
    },
    isEmployee: { type: Boolean, default: false },
    aic: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    ucmo: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    createdBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    updatedBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    deletedBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    // isDeleted: { type: String, default: DeleteStatus.ACTIVE, enum: [DeleteStatus] },
    siteType: { type: String, enum: ['Trsite', 'Fixed'] },
    location: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Users", UserSchema);
