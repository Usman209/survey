const mongoose = require('mongoose');
const { DB_Tables } = require('../utils/enum');

// Child Schema
const childSchema = new mongoose.Schema({
    fatherName: { type: String, required: true, maxlength: 50 },
    childName: { type: String, required: true, maxlength: 50 },
    age: { type: Number, required: true },
    cnic: { type: String, maxlength: 13 },
    phone: { type: String, maxlength: 11 },
    isVaccinated: { type: Boolean, default: true },
    isGuest: { type: Boolean, default: false },
    guestAddress: { type: String, maxlength: 80 },
});

// Family Schema
const familySchema = new mongoose.Schema({
    memberCount: { type: Number, required: true },
    children: [childSchema],
});

// Location Schema (embedded directly in surveySchema)
const locationSchema = new mongoose.Schema({
    userId: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, required: true }
});

// Household Schema
const surveySchema = new mongoose.Schema({
    houseNumber: { type: String, required: true },
    houseType: { type: String, required: true },
    ownership: { type: String, required: true },
    numberOfFamilies: { type: Number, required: true },
    families: [familySchema],
    locations: [locationSchema], // Embedded array of locations
    createdBy: { type: mongoose.Types.ObjectId, ref: DB_Tables.USER, required: true },
    createdAt: { type: Date, default: Date.now } // Automatically set the created date
});

// Models
module.exports = mongoose.model('Survey', surveySchema);
