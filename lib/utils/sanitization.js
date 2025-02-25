const Joi = require("joi");

exports.userRegisterSchemaValidator = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().optional(), // Optional since it's not required in the schema
  email: Joi.string().email().allow(null, '').optional(),
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
  gender:Joi.string().optional(),
  profileImg:Joi.string().optional(),
  thumbnail:Joi.string().optional(),
  tehsilOrTown: Joi.string().optional(), 
  district: Joi.string().optional(),
  isEmployee: Joi.boolean().required(),
  emailVerified:Joi.boolean().optional(),
  siteType:Joi.string().optional(),
  location:Joi.string().optional(),
  address: Joi.object({ // Inline definition of address schema
    street: Joi.string().allow(null, '').optional(),
    city: Joi.string().allow(null, '').optional(),
    state: Joi.string().allow(null, '').optional(),
    zip: Joi.string().allow(null, '').optional(), // Adjust as needed
    country: Joi.string().allow(null, '').optional(),

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
  aic: Joi.string().allow(null).optional(), // Allow ucmo to be a string or null  tehsilOrTown:Joi.string().optional(),
  district:Joi.string().optional(),
  isEmployee:Joi.boolean().optional(),

  territory: Joi.object({ // Inline definition of address schema
    division: Joi.string().allow(null, '').optional(),
    district: Joi.string().allow(null, '').optional(),
    uc: Joi.string().allow(null, '').optional(),
    tehsilOrTown: Joi.string().allow(null, '').optional(), // Adjust as needed
  }).optional(), 
 

});


exports.userLoginSchemaValidator = Joi.object({
  cnic: Joi.string().required(),
  password: Joi.string().required(),
  versionNo: Joi.string().optional(),
  isMobile:Joi.string().optional(),
})

exports.updateProfileSchemaValidator = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phone: Joi.string().optional().min(11),
  ucmo: Joi.string().allow(null).optional(), // Allow ucmo to be a string or null
  aic: Joi.string().allow(null).optional(), // Allow ucmo to be a string or null  tehsilOrTown:Joi.string().optional(),
  isEmployee:Joi.boolean().optional(),
  gender:Joi.string().optional(),
  role: Joi.string().optional(),
  cnic: Joi.string().optional(),
  password: Joi.string().optional(),
  

  address: Joi.object({ // Inline definition of address schema
    street: Joi.string().allow(null, '').optional(),
    city: Joi.string().allow(null, '').optional(),
    state: Joi.string().allow(null, '').optional(),
    zip: Joi.string().allow(null, '').optional(), // Adjust as needed
    country: Joi.string().allow(null, '').optional(),
  }).optional(), 
  createdBy:Joi.string().optional(),
  updatedBy:Joi.string().optional(),
  deletedBy:Joi.string().optional(),

  status:Joi.string().optional(),

  territory: Joi.object({ // Inline definition of address schema
    division: Joi.string().allow(null, '').optional(),
    district: Joi.string().allow(null, '').optional(),
    uc: Joi.string().allow(null, '').optional(),
    tehsilOrTown: Joi.string().allow(null, '').optional(), // Adjust as needed
  }).optional(), 

  siteType: Joi.string().allow(null, '').optional(),

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
  newpassword: Joi.string().required(),
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

