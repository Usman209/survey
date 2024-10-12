// controllers/districtController.js
const District = require("../../lib/schema/district.schema");
const { sendResponse, errReturned } = require("../../lib/utils/dto");


// Create a new district
exports.createDistrict = async (req, res) => {
  try {
    const district = new District(req.body);
    const savedDistrict = await district.save();
    return sendResponse(res, 201, "District created successfully.", savedDistrict);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get all districts
exports.getAllDistricts = async (req, res) => {
  try {
    const districts = await District.find();
    return sendResponse(res, 200, "Districts retrieved successfully.", districts);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get a single district by ID
exports.getDistrictById = async (req, res) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) return errReturned(res, "District not found.");
    return sendResponse(res, 200, "District retrieved successfully.", district);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Update a district by ID
exports.updateDistrict = async (req, res) => {
  try {
    const updatedDistrict = await District.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedDistrict) return errReturned(res, "District not found.");
    return sendResponse(res, 200, "District updated successfully.", updatedDistrict);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Delete a district by ID
exports.deleteDistrict = async (req, res) => {
  try {
    const deletedDistrict = await District.findByIdAndDelete(req.params.id);
    if (!deletedDistrict) return errReturned(res, "District not found.");
    return sendResponse(res, 200, "District deleted successfully.", deletedDistrict);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
