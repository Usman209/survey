const bcrypt = require("bcryptjs");
const USER = require("../../lib/schema/users.schema");
// const TERRITORY = require("../../lib/schema/territory.schema")


require("dotenv").config();

const { sendResponse, errReturned } = require("../../lib/utils/dto");
const { EResponseCode } = require("../../lib/utils/enum");
const {
  findByIdAndUpdate,
  findById,
  pagenate,
} = require("../../lib/utils/abstractRepository");

const {
  updateProfileSchemaValidator,
  updatePasswordSchemaValidator,
  userRegisterSchemaValidator,
} = require("../../lib/utils/sanitization");
const { generateRandomEmail } = require("../../lib/utils/generateEmailAddress");

exports.userProfile = async (req, res) => {
  try {

    let user = await findById({ model: USER, id: req?.params?.id  });

    return sendResponse(res, EResponseCode.SUCCESS, "User Profile", user);
  } catch (e) {
    errReturned(res, e);
  }
};

// exports.userList = async (req, res) => {
//   try {
//     const users = await pagenate({
//       model: USER,
//       projection: "firstName email role status",
//     });
//     return sendResponse(res, EResponseCode.SUCCESS, "User list", users);
//   } catch (err) {
//     errReturned(res, err);
//   }
// };


exports.userList = async (req, res) => {
  try {
    const { id, role } = req.user; // Assuming you have user info in req.user

    let  result = [];

    if (role === "UCMO") {
      
      const aics = await USER.find({ ucmo: id, role: "AIC" });

      for (const aic of aics) {
        // Ensure you fetch FLWs associated with this specific AIC
        const flws = await USER.find({ aic: aic._id, role: "FLW" });
        result.push({ aic, flws });
      }

    } else if (role === "AIC") {
      // If the logged-in user is an AIC, fetch all FLWs under this AIC
       users = await USER.find({ aic: id, role: "FLW" });
    }
    
    else if (role === "FLW") {
      const flw = await USER.findById(id);
      return sendResponse(res, 200, "Your information retrieved successfully.", flw);
    }
    
    else {
      // If the user is an admin, get all users
      users = await pagenate({
        model: USER,
        projection: "firstName email role cnic status",
      });
    }

    return sendResponse(res, EResponseCode.SUCCESS, "User list", users);
  } catch (err) {
    return errReturned(res, err);
  }
};






exports.updatePassword = async (req, res) => {
  try {
    
    const { error, value } = updatePasswordSchemaValidator.validate(req.body);
    if (error) return errReturned(res, error.message);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(value.newpassword, salt);

    const user = await USER.findById(req.params.id);


    // Check if the user exists
    if (!user) return errReturned(res, "User  not found");

    // Directly update the password without validating the old password
    await findByIdAndUpdate({
      model: USER,
      id: req.params.id,
      updateData: {  isFirstLogin: false,password: hashedPassword },
    });

    return sendResponse(res, EResponseCode.SUCCESS, "Password has been updated");
  } catch (error) {
    console.error(error);
    return errReturned(res, "An error occurred while updating the password");
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const userId = req?.params?.id;

    const { error, value } = updateProfileSchemaValidator.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return errReturned(res, error.message);
    }

    // Check if a new password is provided
    if (value.password) {
      const salt = await bcrypt.genSalt(10);
      value.password = await bcrypt.hash(value.password, salt);
    }

    const profile = await findByIdAndUpdate({
      model: USER,
      id: userId,
      updateData: value,
    });

    return sendResponse(res, EResponseCode.SUCCESS, "Profile updated successfully", profile);
  } catch (error) {
    console.error(error);
    return errReturned(res, "An error occurred while updating the profile");
  }
};


exports.userDetail = async (req, res) => {
  try {
    let user = await findById({ model: USER, id: req?.params?.id });

    return sendResponse(res, EResponseCode.SUCCESS, "User Detail", user);
  } catch (error) {
    errReturned(res, error);
  }
};


exports.getAllFLWs = async (req, res) => {
  try {
    const flws = await USER.find({ role: 'FLW' }, "firstName lastName email role cnic phone status"); // Adjust the projection as needed
    return sendResponse(res, EResponseCode.SUCCESS, "FLW list", flws);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.getAllUCMOs = async (req, res) => {
  try {
    const ucmos = await USER.find({ role: 'UCMO' }, "firstName lastName email role cnic  phone status"); // Adjust the projection as needed
    return sendResponse(res, EResponseCode.SUCCESS, "UCMO list", ucmos);
  } catch (err) {
    errReturned(res, err);
  }
};


exports.getAllAdmins = async (req, res) => {
  try {
    const ucmos = await USER.find({ role: 'ADMIN' }, "firstName lastName email role cnic  phone status"); // Adjust the projection as needed
    return sendResponse(res, EResponseCode.SUCCESS, "Admin list", ucmos);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.getAllAICs = async (req, res) => {
  try {
    const aics = await USER.find({ role: 'AIC' }, "firstName lastName email role cnic phone status"); // Adjust the projection as needed
    return sendResponse(res, EResponseCode.SUCCESS, "AIC list", aics);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query; // Get the role from query parameters

    // Validate role input
    const validRoles = ['FLW', 'UCMO', 'AIC'];
    if (!validRoles.includes(role)) {
      return sendResponse(res, EResponseCode.BADREQUEST, "Invalid role provided");
    }

    const users = await USER.find({ role }, "firstName lastName email role cnic phone status"); // Adjust the projection as needed
    return sendResponse(res, EResponseCode.SUCCESS, `${role} list`, users);
  } catch (err) {
    errReturned(res, err);
  }
};


exports.getAICsByUCMO = async (req, res) => {
  try {
    const { ucmoId } = req.params;
    const aics = await USER.find({ role: 'AIC', ucmo: ucmoId }, "firstName lastName email cnic phone role status");
    return sendResponse(res, EResponseCode.SUCCESS, "AICs under UCMO", aics);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.getFLWsByAIC = async (req, res) => {
  try {
    const { aicId } = req.params;
    const flws = await USER.find({ role: 'FLW', aic: aicId }, "firstName lastName email cnic phone role status");
    return sendResponse(res, EResponseCode.SUCCESS, "FLWs under AIC", flws);
  } catch (err) {
    errReturned(res, err);
  }
};


exports.getUCMOWithAICsAndFLWs = async (req, res) => {
  try {
    const { ucmoId } = req.params;

    // Fetch the UCMO
    const ucmo = await USER.findById(ucmoId);
    if (!ucmo) {
      return sendResponse(res, EResponseCode.NOT_FOUND, "UCMO not found");
    }

    // Fetch all AICs under the UCMO
    const aics = await USER.find({ role: 'AIC', ucmo: ucmoId });

    // Fetch FLWs for each AIC
    const aicsWithFLWs = await Promise.all(
      aics.map(async (aic) => {
        const flws = await USER.find({ role: 'FLW', aic: aic._id });
        return { ...aic.toObject(), flws }; // Include FLWs in the AIC object
      })
    );

    // Response structure
    const response = {
      ucmo,
      aics: aicsWithFLWs,
    };

    return sendResponse(res, EResponseCode.SUCCESS, "UCMO with AICs and FLWs", response);
  } catch (err) {
    errReturned(res, err);
  }
};



exports.searchUsers = async (req, res) => {
  try {
    const { role, firstName, email, status } = req.query;

    // Build the query object
    const query = {};

    // Add conditions based on provided query parameters
    if (role) {
      query.role = role;
    }
    if (firstName) {
      query.firstName = { $regex: firstName, $options: 'i' }; // Case-insensitive search
    }
    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }
    if (status) {
      query.status = status;
    }

    // Fetch users matching the query
    const users = await USER.find(query).select("firstName email cnic role phone status");

    // Return the results
    return sendResponse(res, EResponseCode.SUCCESS, "User search results", users);
  } catch (err) {
    errReturned(res, err);
  }
};



exports.addAdmin = async (req, res) => {
  return await addUserWithRole(req, res, "ADMIN");
};

exports.addUmco = async (req, res) => {
  return await addUserWithRole(req, res, "UCMO"); 
};

exports.addAic = async (req, res) => {
  try {
    if (!req.body.ucmo) {
      return errReturned(res, "ucmo is required.");
    }

    return await addUserWithRole(req, res, "AIC");
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.addFlw = async (req, res) => {

  try {
    if (!req.body.aic) {
      return errReturned(res, "aic is required.");
    }

    return await addUserWithRole(req, res, "FLW");
  } catch (error) {
    return errReturned(res, error.message);
  }
};

const addUserWithRole = async (req, res, role) => {
  try {
    const { error, value } = userRegisterSchemaValidator.validate(req.body);
    if (error) {
      return errReturned(res, error.message);
    }

    const { cnic, phone } = value;
    let {email} = value;

    if(!email){
      email = generateRandomEmail(value.firstName);
      value.email = email;
    }


    const emailExist = await USER.findOne({ email });
    if (emailExist) return errReturned(res, "Email Already Exists");

    // Generate password from CNIC and phone
    // const generatedPassword = `${cnic.slice(0, 5)}${phone.slice(-3)}`;
    const generatedPassword = "polio123";
    value.password = await bcrypt.hash(generatedPassword, await bcrypt.genSalt(10));

    // Hardcoded role
    value.role = role;

    const user = new USER(value);
    const data = await user.save();

    return sendResponse(res, EResponseCode.SUCCESS, "User added successfully. Please check your email for verification.", user);
  } catch (error) {
    return errReturned(res, error.message || "An error occurred");
  }
};


exports.searchFlw = async (req, res) => {
  try {
    const { firstName, cnic, phone, aic } = req.query;
    const query = { role:'FLW'}; 
    if (firstName) query.firstName = { $regex: firstName, $options: 'i' };
    if (cnic) query.cnic = cnic; // Exact match for CNIC
    if (phone) query.phone = phone; // Exact match for phone
    if (aic) query.aic = aic; // Exact match for AIC

    const flws = await USER.find(query);
    return sendResponse(res, 200, "FLWs retrieved successfully.", flws);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.getUsersByUcmo = async (req, res) => {
  try {
    const { id } = req.params;

    // Find all AICs under the specified UCMO
    const aics = await USER.find({ ucmo: id, role: "AIC" });

    // Initialize an array to hold results
    const result = [];

    // Fetch FLWs for each AIC
    for (const aic of aics) {
      // Ensure you fetch FLWs associated with this specific AIC
      const flws = await USER.find({ aic: aic._id, role: "FLW" });
      result.push({ aic, flws });
    }

    return sendResponse(res, 200, "AICs and their FLWs retrieved successfully.", result);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.getAicsByUcmo = async (req, res) => {
  try {
    const { id } = req.params;

    // Find all AICs under the specified UCMO
    const aics = await USER.find({ ucmo: id, role: "AIC" });

    return sendResponse(res, 200, "AICs retrieved successfully.", aics);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.getFlwsByAic = async (req, res) => {
  try {
    const { id } = req.params; // AIC ID

    // Find all FLWs associated with the specified AIC
    const flws = await USER.find({ aic: id, role: "FLW" });

    return sendResponse(res, 200, "FLWs retrieved successfully.", flws);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// exports.assignTerritoryToUser = async (req, res) =>{
//   try {
//     const { userId, territoryId } = req.body;

//     let territory = await TERRITORY.findById(territoryId);

//     if(territory === null){
//       return sendResponse(res, EResponseCode.NOTFOUND, "Territory doesn't exist." );
//     }

//     let profile = await findByIdAndUpdate({
//       model: USER,
//       id: userId,
//       updateData: { territory: territoryId },
//       options: {new: true}
//     });

//     if(profile===null){
//       return sendResponse(res, EResponseCode.NOTFOUND, "No user found against provided ID." );
//     }

//     return sendResponse(
//       res,
//       EResponseCode.SUCCESS,
//       "Territory has been assigned",
//       profile
//     );
    
//   } catch (error) {
//     return errReturned(res, error.message);
//   }
// }



// Activate a user by ID
exports.activateUser = async (req, res) => {
  try {
    const userId = req.params.id; // Extract user ID from the request parameters
    const user = await USER.findById(userId);

    if (!user) {
      return errReturned(res, "User not found.");
    }

    // Set user status to ACTIVE
    user.status = 'ACTIVE'; // Adjust the field name based on your schema
    await user.save();

    return sendResponse(res, EResponseCode.SUCCESS, "User activated successfully.", user);
  } catch (error) {
    return errReturned(res, error.message || "An error occurred");
  }
};

// Deactivate a user by ID
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id; // Extract user ID from the request parameters
    const user = await USER.findById(userId);

    if (!user) {
      return errReturned(res, "User not found.");
    }

    // Set user status to INACTIVE
    user.status = 'INACTIVE'; // Adjust the field name based on your schema
    await user.save();

    return sendResponse(res, EResponseCode.SUCCESS, "User deactivated successfully.", user);
  } catch (error) {
    return errReturned(res, error.message || "An error occurred");
  }
};
