const Team = require('../../lib/schema/team.schema'); 
const { errReturned, sendResponse } = require('../../lib/utils/dto');

// Create a new team
exports.createTeam = async (req, res) => {
  try {
    const team = new Team(req.body);
    const savedTeam = await team.save();
    return sendResponse(res, 201, "Team created successfully.", savedTeam);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate('flws createdBy');
    return sendResponse(res, 200, "Teams fetched successfully.", teams);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('flws createdBy');
    if (!team) return errReturned(res, "Team not found.");
    return sendResponse(res, 200, "Team fetched successfully.", team);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTeam) return errReturned(res, "Team not found.");
    return sendResponse(res, 200, "Team updated successfully.", updatedTeam);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);
    if (!deletedTeam) return errReturned(res, "Team not found.");
    return sendResponse(res, 200, "Team deleted successfully.");
  } catch (error) {
    return errReturned(res, error.message);
  }
};
