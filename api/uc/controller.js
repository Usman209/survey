// controllers/ucController.js
const Uc = require("../../lib/schema/uc.schema");
const { sendResponse, errReturned } = require("../../lib/utils/dto");


// Create a new uc
exports.createUc = async (req, res) => {
  try {
    const uc = new Uc(req.body);
    const savedUc = await uc.save();
    return sendResponse(res, 201, "Uc created successfully.", savedUc);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get all ucs
exports.getAllUcs = async (req, res) => {
  try {
    const ucs = await Uc.find();
    return sendResponse(res, 200, "Ucs retrieved successfully.", ucs);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get a single uc by ID
exports.getUcById = async (req, res) => {
  try {
    const uc = await Uc.findById(req.params.id).populate('division');
    if (!uc) return errReturned(res, "Uc not found.");
    return sendResponse(res, 200, "Uc retrieved successfully.", uc);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Update a uc by ID
exports.updateUc = async (req, res) => {
  try {
    const updatedUc = await Uc.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUc) return errReturned(res, "Uc not found.");
    return sendResponse(res, 200, "Uc updated successfully.", updatedUc);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Delete a uc by ID
exports.deleteUc = async (req, res) => {
  try {
    const deletedUc = await Uc.findByIdAndDelete(req.params.id);
    if (!deletedUc) return errReturned(res, "Uc not found.");
    return sendResponse(res, 200, "Uc deleted successfully.", deletedUc);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
