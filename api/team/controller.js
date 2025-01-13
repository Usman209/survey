const Team = require('../../lib/schema/team.schema');
const USER = require('../../lib/schema/users.schema');
const redisClient = require("../../config/redis");
const mongoose = require('mongoose');


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

    let teamName = req.body.teamName;

    // If teamName is provided in the request, check if it already exists in the database
    if (teamName) {
      const existingTeam = await Team.findOne({ teamName });

      if (existingTeam) {
        return errReturned(res, "The team name already exists.");
      }
    } else {
      // If no teamName is provided, generate a unique team name as before
      teamName = await generateUniqueTeamName(uc);
    }

    const flwIds = req.body.flws;
    if (flwIds && flwIds.length > 0) {
      const existingTeams = await Team.find({ flws: { $in: flwIds } });

      if (existingTeams.length > 0) {
        return errReturned(res, "One or more FLWs are already assigned to another team.");
      }
    }

    // Create the new team with the given or generated teamName
    const team = new Team({
      ...req.body,
      teamName,
    });

    const savedTeam = await team.save();
    await redisClient.del('all_teams'); // Invalidate cache
    await redisClient.del('flw_list');

    return sendResponse(res, 201, "Team created successfully.", savedTeam);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.getAllTeams1 = async (req, res) => {
  try {
    // Get pagination parameters from query (defaults for page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the number of items to skip for pagination
    const skip = (page - 1) * limit;

    // Fetch teams from the database with pagination and populate relevant fields
    const teams = await Team.find()
      .skip(skip)
      .limit(limit)
      .populate('flws createdBy');

    // Get the total number of teams for pagination info
    const totalTeams = await Team.countDocuments();

    // Return the paginated teams data along with pagination info
    return sendResponse(res, 200, "Teams fetched successfully.", {
      currentPage: page,
      totalItems: totalTeams,
      totalPages: Math.ceil(totalTeams / limit),
      itemsPerPage: limit,
      data: teams
    });
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
      Object.entries(req.body).filter(([_, value]) => value !== null) // Ensure no null values are included
    );

    // Check if territory and uc are valid if being updated
    if (updateData.territory?.uc) {
      if (typeof updateData.territory.uc !== 'string' || updateData.territory.uc.trim() === '') {
        return errReturned(res, "Invalid UC value provided.");
      }

      // Handle the teamName logic when 'territory.uc' is updated
      if (updateData.teamName) {
        // Check if the provided teamName is a valid string
        if (typeof updateData.teamName !== 'string' || updateData.teamName.trim() === '') {
          return errReturned(res, "Invalid team name provided.");
        }

        // Check if teamName already exists
        const existingTeam = await Team.findOne({ teamName: updateData.teamName });
        if (existingTeam) {
          return errReturned(res, "The team name already exists.");
        }
      } else {
        // If no teamName is provided, generate a unique team name based on 'territory.uc'
        const newTeamName = await generateUniqueTeamName(updateData.territory.uc);
        updateData.teamName = newTeamName; // Update team name
      }
    } else if (updateData.teamName) {
      // If only teamName is being updated (territory.uc is not updated)
      if (typeof updateData.teamName !== 'string' || updateData.teamName.trim() === '') {
        return errReturned(res, "Invalid team name provided.");
      }

      // Check if the provided teamName already exists
      const existingTeam = await Team.findOne({ teamName: updateData.teamName });
      if (existingTeam) {
        return errReturned(res, "The team name already exists.");
      }
    }

    // Proceed to update the team
    const updatedTeam = await Team.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedTeam) {
      return errReturned(res, "Team not found.");
    }

    // Cache invalidation: Ensure that caches are cleared after successful update
    await redisClient.del('all_teams');
    await redisClient.del('flw_list');

    return sendResponse(res, 200, "Team updated successfully.", updatedTeam);
  } catch (error) {
    // Catch unexpected errors and return a safe message
    console.error(error); // Log the error for debugging purposes
    return errReturned(res, "An unexpected error occurred while updating the team.");
  }
};



exports.deleteTeam = async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);
    if (!deletedTeam) return errReturned(res, "Team not found.");
    
    await redisClient.del('all_teams'); // Invalidate cache
    await redisClient.del('flw_list');

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
    const { teamNumber, teamName, district, division, uc, tehsilOrTown, aic, ucmo, cnic } = req.query;


    const filter = {};

    // Add team filters
    if (teamNumber) filter.teamNumber = teamNumber;
    if (teamName) filter.teamName = new RegExp(teamName, 'i');
    if (district) filter.territory = { ...filter.territory, district: new RegExp(district, 'i') };
    if (division) filter.territory = { ...filter.territory, division: new RegExp(division, 'i') };
    if (uc) filter.territory = { ...filter.territory, uc: new RegExp(uc, 'i') };
    if (tehsilOrTown) filter.territory = { ...filter.territory, tehsilOrTown: new RegExp(tehsilOrTown, 'i') };
    if (aic) filter.aic = aic;
    if (ucmo) filter.ucmo = ucmo;

    if (cnic) {
      const user = await USER.findOne({ cnic }).select('_id role');

      if (!user) {
        return sendResponse(res, 404, "No user found with the provided CNIC.");
      }

      // Based on the user's role, we modify the filter object
      if (user.role === 'FLW') {
        // Use new to create an ObjectId instance
        filter.flws = { $in: [new mongoose.Types.ObjectId(user._id)] };
      } else if (user.role === 'AIC') {
        filter.aic = new mongoose.Types.ObjectId(user._id);
      } else if (user.role === 'UCMO') {
        filter.ucmo = new mongoose.Types.ObjectId(user._id);
      } else {
        return sendResponse(res, 400, "The CNIC belongs to a user with an invalid role for team search.");
      }
    }


    // Fetch teams matching the filter from the database
    const teams = await Team.find(filter).populate('flws createdBy aic ucmo');


    if (teams.length === 0) {
      return sendResponse(res, 404, "No teams found matching the provided criteria.");
    }

    return sendResponse(res, 200, "Teams retrieved successfully.", teams);
  } catch (error) {
    console.error("Error in searchTeams:", error);
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



exports.updateAic = async (req, res) => {
  const { currentCnic, newCnic } = req.body;

  try {
    // Find the current AIC user by CNIC
    const currentUser = await USER.findOne({ cnic: currentCnic,role: "AIC" }).select("_id cnic role territory");

    // Find the new AIC user by CNIC
    const newUser = await USER.findOne({ cnic: newCnic, role: "AIC" }).select("_id cnic role territory");

    // Check if the current user exists and has the role other than ADMIN
    if (!currentUser) {
      return res.status(404).json({ message: 'Current AIC not found or invalid CNIC provided.' });
    }
    if (!newUser) {
      return res.status(404).json({ message: 'New AIC not found or invalid CNIC provided.' });
    }

    // Check if the new user exists and has the role "AIC"
    if (!newUser || newUser.role !== "AIC") {
      return res.status(400).json({ message: 'New user must have the role "AIC".' });
    }

    // Check if the new user's territory.uc matches the current user's territory.uc
    if (currentUser.territory.uc !== newUser.territory.uc) {
      return res.status(400).json({ message: 'New user\'s territory.uc must match the current user\'s territory.uc.' });
    }

    // Find all teams associated with the current AIC (based on their ObjectId)
    const teams = await Team.find({ aic: currentUser._id });

    if (teams.length === 0) {
      return res.status(404).json({ message: 'No teams found for the current AIC.' });
    }

    // Update all teams to the new AIC
    const updatePromises = teams.map(team => {
      return Team.findByIdAndUpdate(team._id, { aic: newUser._id });
    });

    await Promise.all(updatePromises);

    res.status(200).json({ message: 'AIC updated successfully for all related teams.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
};


exports.updateUcmo = async (req, res) => {
  const { currentCnic, newCnic } = req.body;
  

  try {
    // Find the current AIC user by CNIC
    const currentUser = await USER.findOne({ cnic: currentCnic,  role: "UCMO" }).select("_id cnic role territory");

    // Find the new AIC user by CNIC
    const newUser = await USER.findOne({ cnic: newCnic, role: "UCMO" }).select("_id cnic role territory");

    // Check if the current user exists and has the role other than ADMIN
    if (!currentUser) {
      return res.status(404).json({ message: 'Current UCMO not found or invalid CNIC provided.' });
    }
    if (!newUser) {
      return res.status(404).json({ message: 'New UCMO not found or invalid CNIC provided.' });
    }

    // Check if the new user exists and has the role "AIC"
    if (!newUser || newUser.role !== "UCMO") {
      return res.status(400).json({ message: 'both user must have the role "UCMO".' });
    }

    // Check if the new user's territory.uc matches the current user's territory.uc
    if (currentUser.territory.uc !== newUser.territory.uc) {
      return res.status(400).json({ message: 'New user\'s territory.uc must match the current user\'s territory.uc.' });
    }

    // Find all teams associated with the current AIC (based on their ObjectId)
    const teams = await Team.find({ ucmo: currentUser._id });

    if (teams.length === 0) {
      return res.status(404).json({ message: 'No teams found for the current UCMO.' });
    }

    // Update all teams to the new AIC
    const updatePromises = teams.map(team => {
      return Team.findByIdAndUpdate(team._id, { ucmo: newUser._id });
    });

    await Promise.all(updatePromises);

    res.status(200).json({ message: 'UCMO updated successfully for all related teams.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
};
