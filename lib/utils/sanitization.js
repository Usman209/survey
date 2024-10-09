const Joi = require("joi");

exports.userRegisterSchemaValidator = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().optional(), // Optional since it's not required in the schema
  email: Joi.string().email().required(),
  password: Joi.string().optional(),
  contact: Joi.string().optional(), // Optional contact field
  designation: Joi.string().optional(), // Optional designation field
  cnic: Joi.string().length(13).required(), // CNIC must be exactly 13 characters
  phone: Joi.string().min(11).required(), // Adjusted min length for phone
  role: Joi.string().optional(),
  team: Joi.string().optional(),
  status:Joi.string().optional(),
  uc: Joi.string().optional(),
  bio:Joi.string().optional(),
  profileImg:Joi.string().optional(),
  thumbnail:Joi.string().optional(),
  townOrTehsil: Joi.string().optional(), 
  district: Joi.string().optional(),
  isEmployee: Joi.boolean().required(),
  emailVerified:Joi.boolean().optional(),
  address: Joi.object({ // Inline definition of address schema
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip: Joi.string().required(), // Adjust as needed
    country: Joi.string().required(),
  }).optional(), 
  lastLogin: Joi.date().optional(),
  qualifications: Joi.array().items(
    Joi.object({
      name: Joi.string().required(), // Qualification name is required
      fileUrls: Joi.array().items(Joi.string().uri()).required(), // Array of file URLs is required
    })
  ).optional(),
  createdBy:Joi.string().optional(),
  updatedBy:Joi.string().optional(),
  deletedBy:Joi.string().optional(),
  ucmo: Joi.string().allow(null).optional(), // Allow ucmo to be a string or null
  aic: Joi.string().allow(null).optional(), // Allow ucmo to be a string or null  townOrTehsil:Joi.string().optional(),
  district:Joi.string().optional(),
  isEmployee:Joi.boolean().optional(),


});


exports.userLoginSchemaValidator = Joi.object({
  cnic: Joi.string().required(),
  password: Joi.string().required().min(4)
})

exports.updateProfileSchemaValidator = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string(),
  phone: Joi.string().required().min(11),
})

exports.createStaffSchemaValidator = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  phone: Joi.string().required(),
  role: Joi.string().valid('STAFF').required(),
  profileImg:Joi.string(),
  certifications: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      fileUrls: Joi.array().items(Joi.string()).min(1).required(),
    })
  ),
  qualifications: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      fileUrls: Joi.array().items(Joi.string()).min(1).required(),
    })
  ),
  businessId: Joi.string().required(),
  serviceId: Joi.string().required()

});

exports.updateStaffSchemaValidator = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  phone: Joi.string().required(),
  role: Joi.string().valid('STAFF').required(),
  profileImg:Joi.string(),
  certifications: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      fileUrls: Joi.array().items(Joi.string()).min(1).required(),
    })
  ),
  qualifications: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      fileUrls: Joi.array().items(Joi.string()).min(1).required(),
    })
  ),
  businessId: Joi.string().required(),
  serviceId: Joi.string().required()

});

exports.updatePasswordSchemaValidator = Joi.object({
  oldpassword: Joi.string().required().min(4),
  newpassword: Joi.string().required().min(4),
})

exports.createServiceSchemaValicator = Joi.object( {
  name: Joi.string().required(),
  description: Joi.string(),
  price: Joi.number(),
  subServices: Joi.array().items( Joi.string() ).default( [] ),
  availability: Joi.string(),
  image: Joi.string(),
  review: Joi.string(),
  businessId: Joi.string().required(),
  createdBy: Joi.string(),
  updatedBy: Joi.string(),
  deletedBy: Joi.string(),
  isDeleted: Joi.string()
} ).unknown( true );

