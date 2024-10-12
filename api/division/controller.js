// controllers/divisionController.js
const Division = require("../../lib/schema/division.schema");
const { sendResponse, errReturned } = require("../../lib/utils/dto");

// Create a new division
exports.createDivision = async (req, res) => {
  try {
    const division = new Division(req.body);
    const savedDivision = await division.save();
    return sendResponse(res, 201, "Division created successfully.", savedDivision);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get all divisions
exports.getAllDivisions = async (req, res) => {
  try {
    const divisions = await Division.find();
    return sendResponse(res, 200, "Divisions retrieved successfully.", divisions);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get a single division by ID
exports.getDivisionById = async (req, res) => {
  try {
    const division = await Division.findById(req.params.id);
    if (!division) return errReturned(res, "Division not found.");
    return sendResponse(res, 200, "Division retrieved successfully.", division);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Update a division by ID
exports.updateDivision = async (req, res) => {
  try {
    const updatedDivision = await Division.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedDivision) return errReturned(res, "Division not found.");
    return sendResponse(res, 200, "Division updated successfully.", updatedDivision);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Delete a division by ID
exports.deleteDivision = async (req, res) => {
  try {
    const deletedDivision = await Division.findByIdAndDelete(req.params.id);
    if (!deletedDivision) return errReturned(res, "Division not found.");
    return sendResponse(res, 200, "Division deleted successfully.", deletedDivision);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
