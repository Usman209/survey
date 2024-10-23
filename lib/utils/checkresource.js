const USER = require('../schema/users.schema');
const Team = require('../schema/team.schema'); // Adjust the path as needed



const getFLWIdsByAIC = async (aicId) => {
  try {
    const flws = await USER.find({ role: 'FLW', aic: aicId }, "_id");
    return flws.map(fl => fl._id.toString());
  } catch (err) {
    throw new Error('Error fetching FLW IDs for AIC: ' + err.message);
  }
};

// Function to get user IDs by UCMO
const getUserIdsByUcmo = async (ucmoId) => {
  try {
    const aics = await USER.find({ ucmo: ucmoId, role: "AIC" });
    const userIds = [];

    for (const aic of aics) {
      userIds.push(aic._id.toString());

      const flws = await USER.find({ aic: aic._id, role: "FLW" });
      flws.forEach(fl => userIds.push(fl._id.toString()));
    }

    return userIds;
  } catch (error) {
    throw new Error('Error fetching user IDs for UCMO: ' + error.message);
  }
};

// Combined function to check access based on user role
const checkUserAccess = async (userId, userRole, paramId) => {
  // Bypass checks for ADMIN and SUPER_ADMIN
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    return { isAllowed: true }; // Allow access
  }

  let allowedIds = [];

  // Fetch allowed IDs based on role
  if (userRole === 'AIC') {
    allowedIds = await getFLWIdsByAIC(userId);
  } else if (userRole === 'UCMO') {
    allowedIds = await getUserIdsByUcmo(userId);
  }


  // Check if the user is updating their own profile
  const isSelf = userId === paramId;

  // Check if the paramId is in the allowed IDs
  const isAllowed = allowedIds.includes(paramId);

  return { isSelf, isAllowed };
};




// Function to get allowed team IDs based on user role
const getAllowedTeamIds = async (userRole, userId) => {
  let allowedIds = [];



  

   if (userRole === 'AIC') {
    // Fetch teams associated with the AIC ID
    const teams = await Team.find({ aic: userId });
    allowedIds = teams.map(team => team._id.toString());
  } else if (userRole === 'UCMO') {
    // Fetch teams associated with the UCMO ID
    const teams = await Team.find({ ucmo: userId });
    allowedIds = teams.map(team => team._id.toString());
  }

  return allowedIds;
};

// Function to get team details based on user role
const getTeamDetailsByRole = async (userRole, userId) => {
  let teamDetails = [];

  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    // Fetch all team details for ADMIN and SUPER_ADMIN
    teamDetails = await Team.find().populate('flws ucmo').select('territory teamName flws ucmo');
  } else if (userRole === 'AIC') {
    // Fetch teams associated with the AIC ID
    teamDetails = await Team.find({ aic: userId }).populate('flws ucmo').select('territory teamName flws ucmo');
  } else if (userRole === 'UCMO') {
    // Fetch teams associated with the UCMO ID
    teamDetails = await Team.find({ ucmo: userId }).populate('flws aic').select('territory teamName flws aic');
  }

  return teamDetails;
};




module.exports = {
  getTeamDetailsByRole,
  getAllowedTeamIds,
  checkUserAccess
};

