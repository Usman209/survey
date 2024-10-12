// controllers/tehsilController.js
const Tehsil = require("../../lib/schema/tehsiltown.schema");
const { sendResponse, errReturned } = require("../../lib/utils/dto");


// Create a new tehsil
exports.createTehsil = async (req, res) => {
  try {
    const tehsil = new Tehsil(req.body);
    const savedTehsil = await tehsil.save();
    return sendResponse(res, 201, "Tehsil created successfully.", savedTehsil);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get all tehsils
exports.getAllTehsils = async (req, res) => {
  try {
    const tehsils = await Tehsil.find();
    return sendResponse(res, 200, "Tehsils retrieved successfully.", tehsils);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get a single tehsil by ID
exports.getTehsilById = async (req, res) => {
  try {
    const tehsil = await Tehsil.findById(req.params.id).populate('division');
    if (!tehsil) return errReturned(res, "Tehsil not found.");
    return sendResponse(res, 200, "Tehsil retrieved successfully.", tehsil);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Update a tehsil by ID
exports.updateTehsil = async (req, res) => {
  try {
    const updatedTehsil = await Tehsil.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTehsil) return errReturned(res, "Tehsil not found.");
    return sendResponse(res, 200, "Tehsil updated successfully.", updatedTehsil);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Delete a tehsil by ID
exports.deleteTehsil = async (req, res) => {
  try {
    const deletedTehsil = await Tehsil.findByIdAndDelete(req.params.id);
    if (!deletedTehsil) return errReturned(res, "Tehsil not found.");
    return sendResponse(res, 200, "Tehsil deleted successfully.", deletedTehsil);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
