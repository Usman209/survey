// routes/districtRoutes.js
const express = require("express");
const router = express.Router();
const Controller = require("./controller");

// Define routes
router.post("/", Controller.createTehsil); 
router.get("/", Controller.getAllTehsils); 
router.get("/:id", Controller.getTehsilById); 
router.put("/:id", Controller.updateTehsil); 
router.delete("/:id", Controller.deleteTehsil); 

module.exports = router;
