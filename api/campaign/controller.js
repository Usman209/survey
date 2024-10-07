const { errReturned, sendResponse } = require('../../lib/utils/dto');
const Campaign = require('../../lib/schema/campaign.schema'); // Adjust the path as needed

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const campaign = new Campaign(req.body);
    const savedCampaign = await campaign.save();
    return sendResponse(res, 201, "Campaign created successfully.", savedCampaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().populate('assignedTeam createdBy');
    return sendResponse(res, 200, "Campaigns fetched successfully.", campaigns);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get a single campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('assignedTeam createdBy');
    if (!campaign) return errReturned(res, "Campaign not found.");
    return sendResponse(res, 200, "Campaign fetched successfully.", campaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Update a campaign by ID
exports.updateCampaign = async (req, res) => {
  try {
    const updatedCampaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCampaign) return errReturned(res, "Campaign not found.");
    return sendResponse(res, 200, "Campaign updated successfully.", updatedCampaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Delete a campaign by ID
exports.deleteCampaign = async (req, res) => {
  try {
    const deletedCampaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!deletedCampaign) return errReturned(res, "Campaign not found.");
    return sendResponse(res, 200, "Campaign deleted successfully.");
  } catch (error) {
    return errReturned(res, error.message);
  }
};
