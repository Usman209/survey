const Team = require('../../lib/schema/team.schema');
const { errReturned, sendResponse } = require('../../lib/utils/dto');

// Add FLW to a team
exports.addFLWToTeam = async (req, res) => {
  const { teamId, flwId } = req.body;

  try {
    if (!teamId || !flwId) {
      return errReturned(res, "teamId and flwId are required.");
    }

    const team = await Team.findById(teamId);
    if (!team) return errReturned(res, "Team not found.");

    const existingTeam = await Team.findOne({ flws: flwId });

    if (existingTeam && existingTeam._id.toString() !== teamId) {
      existingTeam.flws = existingTeam.flws.filter(flw => flw.toString() !== flwId);
      await existingTeam.save();
    }

    if (!team.flws.includes(flwId)) {
      team.flws.push(flwId);
      await team.save();
      return sendResponse(res, 200, "FLW added to team successfully.", team);
    } else {
      return errReturned(res, "FLW is already in this team.");
    }
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Remove FLW from a team
exports.removeFLWFromTeam = async (req, res) => {
  const { teamId, flwId } = req.body;

  try {
    if (!teamId || !flwId) {
      return errReturned(res, "teamId and flwId are required.");
    }

    const team = await Team.findById(teamId);
    if (!team) return errReturned(res, "Team not found.");

    // Check if FLW is in the team
    if (!team.flws.includes(flwId)) {
      return errReturned(res, "FLW not found in this team.");
    }

    // Remove the FLW from the team
    team.flws = team.flws.filter(flw => flw.toString() !== flwId);
    await team.save();

    return sendResponse(res, 200, "FLW removed from team successfully.", team);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

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
