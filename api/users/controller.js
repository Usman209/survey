const bcrypt = require("bcryptjs");
const USER = require("../../lib/schema/users.schema");

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

exports.userProfile = async (req, res) => {
  try {

    let user = await findById({ model: USER, id: req?.params?.id  });

    return sendResponse(res, EResponseCode.SUCCESS, "User Profile", user);
  } catch (e) {
    errReturned(res, e);
  }
};

exports.userList = async (req, res) => {
  try {
    const users = await pagenate({
      model: USER,
      projection: "name email role status",
    });
    return sendResponse(res, EResponseCode.SUCCESS, "User list", users);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { error, value } = updatePasswordSchemaValidator.validate(req.body);
    if (error) return errReturned(res, error.message);

    const salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(value.newpassword, salt);

    let user = await findById({ model: USER, id: req?.user?.id });

    const validPass = await bcrypt.compare(value.oldpassword, user.password);
    if (!validPass) return errReturned(res, "Invalid Password");

    let status = await findByIdAndUpdate({
      model: USER,
      id: req?.user?.id,
      updateData: { password: hashedPassword },
    });

    if (status["nModified"])
      return sendResponse(res, EResponseCode.NOTFOUND, "Already updated");

    return sendResponse(
      res,
      EResponseCode.SUCCESS,
      "Password has been updated"
    );
  } catch (error) {
    console.log(error);
    errReturned(res, error);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req?.params?.id 

    const { error, value } = updateProfileSchemaValidator.validate(req.body, {
      stripUnknown: true, // Exclude unknown fields, including "_id"
    });    if (error) {
      return errReturned(res, error.message);
    }
    
    const hasNewImage = value.profileImg !== undefined && value.profileImg !== null;

    // If a new image is provided, delete the previous image
    if (hasNewImage) {
      const user = await findById({ model: USER, id: userId  });

      if (user && user.profileImg) {
        // Assuming user.image is the field where the image path is stored
        // Delete the previous image
        await fs.unlink(user.profileImg);
      }
    }

    const profile = await findByIdAndUpdate({
      model: USER,
      id: userId,
      updateData: value,
    });
    return sendResponse(res, EResponseCode.SUCCESS, "success", profile);
  } catch (error) {
    console.log(error);
    errReturned(res, error);
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
    const flws = await USER.find({ role: 'FLW' }, "name email role status"); // Adjust the projection as needed
    return sendResponse(res, EResponseCode.SUCCESS, "FLW list", flws);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.getAllUCMOs = async (req, res) => {
  try {
    const ucmos = await USER.find({ role: 'UCMO' }, "name email role status"); // Adjust the projection as needed
    return sendResponse(res, EResponseCode.SUCCESS, "UCMO list", ucmos);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.getAllAICs = async (req, res) => {
  try {
    const aics = await USER.find({ role: 'AIC' }, "name email role status"); // Adjust the projection as needed
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
      return sendResponse(res, EResponseCode.BAD_REQUEST, "Invalid role provided");
    }

    const users = await USER.find({ role }, "name email role status"); // Adjust the projection as needed
    return sendResponse(res, EResponseCode.SUCCESS, `${role} list`, users);
  } catch (err) {
    errReturned(res, err);
  }
};


exports.getAICsByUCMO = async (req, res) => {
  try {
    const { ucmoId } = req.params;
    const aics = await USER.find({ role: 'AIC', ucmoId }, "name email role status");
    return sendResponse(res, EResponseCode.SUCCESS, "AICs under UCMO", aics);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.getFLWsByAIC = async (req, res) => {
  try {
    const { aicId } = req.params;
    const flws = await USER.find({ role: 'FLW', aicId }, "name email role status");
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
    const aics = await USER.find({ role: 'AIC', ucmoId: ucmoId });

    // Fetch FLWs for each AIC
    const aicsWithFLWs = await Promise.all(
      aics.map(async (aic) => {
        const flws = await USER.find({ role: 'FLW', aicId: aic._id });
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
    const { role, name, email, status } = req.query;

    // Build the query object
    const query = {};

    // Add conditions based on provided query parameters
    if (role) {
      query.role = role;
    }
    if (name) {
      query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
    }
    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }
    if (status) {
      query.status = status;
    }

    // Fetch users matching the query
    const users = await USER.find(query).select("name email role status");

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
  return await addUserWithRole(req, res, "AIC");
};

exports.addFlw = async (req, res) => {
  return await addUserWithRole(req, res, "FLW");
};

const addUserWithRole = async (req, res, role) => {
  try {
    const { error, value } = userRegisterSchemaValidator.validate(req.body);
    if (error) {
      return errReturned(res, error.message);
    }

    const { email, cnic, phone } = value;
    const emailExist = await USER.findOne({ email });
    if (emailExist) return errReturned(res, "Email Already Exists");

    // Generate password from CNIC and phone
    const generatedPassword = `${cnic.slice(0, 5)}${phone.slice(-3)}`;
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

