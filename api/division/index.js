// routes/districtRoutes.js
const express = require("express");
const router = express.Router();
const Controller = require("./controller");


router.post("/", Controller.createDivision); 
router.get("/", Controller.getAllDivisions); 
router.get("/:id", Controller.getDivisionById); 
router.put("/:id", Controller.updateDivision); 
router.delete("/:id", Controller.deleteDivision); 

module.exports = router;
