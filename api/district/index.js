// routes/districtRoutes.js
const express = require("express");
const router = express.Router();
const Controller = require("./controller");

// Define routes
router.post("/", Controller.createDistrict); 
router.get("/", Controller.getAllDistricts); 
router.get("/:id", Controller.getDistrictById); 
router.put("/:id", Controller.updateDistrict); 
router.delete("/:id", Controller.deleteDistrict); 

module.exports = router;
