const Team = require('../../lib/schema/team.schema');
const USER = require('../../lib/schema/users.schema');
const redisClient = require("../../config/redis");

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

      await redisClient.del('all_teams'); // Invalidate cache
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

    if (!team.flws.includes(flwId)) {
      return errReturned(res, "FLW not found in this team.");
    }

    team.flws = team.flws.filter(flw => flw.toString() !== flwId);
    await team.save();

    await redisClient.del('all_teams'); // Invalidate cache
    return sendResponse(res, 200, "FLW removed from team successfully.", team);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.createTeam = async (req, res) => {
  try {
    const uc = req.body.territory?.uc;
    if (!uc) {
      return errReturned(res, "UC is required.");
    }

    const teamName = await generateUniqueTeamName(uc);

    const flwIds = req.body.flws;
    if (flwIds && flwIds.length > 0) {
      const existingTeams = await Team.find({ flws: { $in: flwIds } });

      if (existingTeams.length > 0) {
        return errReturned(res, "One or more FLWs are already assigned to another team.");
      }
    }

    const team = new Team({
      ...req.body,
      teamName,
    });

    const savedTeam = await team.save();
    await redisClient.del('all_teams'); // Invalidate cache
    return sendResponse(res, 201, "Team created successfully.", savedTeam);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.getAllTeams = async (req, res) => {
  try {
    const cachedTeams = await redisClient.get('all_teams');
    if (cachedTeams) {
      return sendResponse(res, 200, "Teams fetched successfully.", JSON.parse(cachedTeams));
    }

    const teams = await Team.find().populate('flws createdBy');
    await redisClient.set('all_teams', JSON.stringify(teams)); // Cache the result
    return sendResponse(res, 200, "Teams fetched successfully.", teams);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('flws createdBy')
      .populate('aic', '_id firstName lastName phone cnic')
      .populate('ucmo', '_id firstName lastName phone cnic');

    if (!team) return errReturned(res, "Team not found.");

    return sendResponse(res, 200, "Team fetched successfully.", team);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const updateData = Object.fromEntries(
      Object.entries(req.body).filter(([_, value]) => value !== null)
    );

    // Check if 'territory.uc' is being updated
    if (updateData.territory?.uc) {
      const newTeamName = await generateUniqueTeamName(updateData.territory.uc);
      updateData.teamName = newTeamName; // Update team name
    }

    const updatedTeam = await Team.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedTeam) {
      return errReturned(res, "Team not found.");
    }

    await redisClient.del('all_teams'); // Invalidate cache
    return sendResponse(res, 200, "Team updated successfully.", updatedTeam);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.deleteTeam = async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);
    if (!deletedTeam) return errReturned(res, "Team not found.");
    
    await redisClient.del('all_teams'); // Invalidate cache
    return sendResponse(res, 200, "Team deleted successfully.");
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Fetch teams by UCMO or AIC
exports.getTeamsByUcmo = async (req, res) => {
  try {
    const { id, role } = req.query;
    let result = [];

    if (role === "UCMO") {
      const aics = await USER.find({ ucmo: id, role: "AIC" });
      for (const aic of aics) {
        const teams = await Team.find({ aic: aic._id });
        result.push({ aic, teams });
      }
    } else if (role === "AIC") {
      const teams = await Team.find({ aic: id });
      result.push({ aic: { _id: id }, teams });
    } else if (role === "FLW") {
      const flw = await USER.findById(id);
      const teams = await Team.find({ flws: flw._id });
      result.push({ flw, teams });
    } else if (role === "ADMIN") {
      result = await Team.find({});
    } else {
      return sendResponse(res, 403, "Unauthorized role.");
    }

    return sendResponse(res, 200, "Teams retrieved successfully.", result);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.searchTeams = async (req, res) => {
  try {
    const { teamNumber, teamName, district, division, uc, tehsilOrTown, aic, ucmo } = req.query;

    const filter = {};
    
    if (teamNumber) filter.teamNumber = teamNumber;
    if (teamName) filter.teamName = new RegExp(teamName, 'i');
    if (district) filter.territory = { ...filter.territory, district: new RegExp(district, 'i') };
    if (division) filter.territory = { ...filter.territory, division: new RegExp(division, 'i') };
    if (uc) filter.territory = { ...filter.territory, uc: new RegExp(uc, 'i') };
    if (tehsilOrTown) filter.territory = { ...filter.territory, tehsilOrTown: new RegExp(tehsilOrTown, 'i') };
    if (aic) filter.aic = aic;
    if (ucmo) filter.ucmo = ucmo;

    const teams = await Team.find(filter);
    return sendResponse(res, 200, "Teams retrieved successfully.", teams);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

const generateUniqueTeamName = async (uc) => {
  let baseName = `${uc}`;
  let counter = 1;
  let uniqueName = `${baseName}-${counter}`;

  while (await Team.findOne({ teamName: uniqueName })) {
    counter++;
    uniqueName = `${baseName}-${counter}`;
  }

  return uniqueName;
};

exports.getTeamDetailsByUserId = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await USER.findById(id);
    if (!user) {
      return errReturned(res, "User not found.");
    }

    let teamDetails;

    if (user.role === 'FLW') {
      teamDetails = await Team.find({ flws: id })
        .populate('ucmo aic')
        .select('territory teamName ucmo aic flws');
    } else if (user.role === 'AIC') {
      teamDetails = await Team.find({ aic: id })
        .populate('flws ucmo')
        .select('territory teamName flws ucmo');
    } else if (user.role === 'UCMO') {
      teamDetails = await Team.find({ ucmo: id })
        .populate('flws aic')
        .select('territory teamName flws aic');
    } else {
      return errReturned(res, "Unauthorized role.");
    }

    return sendResponse(res, 200, "Team details retrieved successfully.", teamDetails);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
