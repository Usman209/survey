const mongoose = require("mongoose");
const { Schema } = mongoose;
const { EUserRole, UserStatus, DeleteStatus, DB_Tables } = require("../../lib/utils/enum");

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    cnic: {
      type: String,
      required: true,
      unique: true,
      minlength: 13,
      maxlength: 13,
    },
    phone: { type: String,required: true },
    password: { type: String, required: true },
    contact: { type: String },
    designation: { type: String },
    status: { type: String, default: UserStatus.INACTIVE, enum: [UserStatus] },
    role: {
      type: String,
      enum: [
        EUserRole
      ],
    },
    emailVerified: { type: Boolean, default: false },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    bio: { type: String },
    profileImg: { type: String },
    thumbnail: { type: String },
    lastLogin: { type: Date },
    qualifications: [
      {
        degree: { type: String },
        institution: { type: String },
        year: { type: Number }
      }
    ],

    team: { type: mongoose.Types.ObjectId, ref: DB_Tables.TEAM }, 

    territory: { type: mongoose.Types.ObjectId, ref: DB_Tables.Territory},

    isEmployee: { type: Boolean, default: false },

    aic: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    ucmo: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },

    createdBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    updatedBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    deletedBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER },
    isDeleted: { type: String, default: DeleteStatus.ACTIVE, enum: [DeleteStatus] },
  
  
    
  },
  { timestamps: true }
);

module.exports = mongoose.model("Users", UserSchema);
