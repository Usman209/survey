// routes/districtRoutes.js
const express = require("express");
const router = express.Router();
const Controller = require("./controller");

// Define routes
router.post("/", Controller.createUc); 
router.get("/", Controller.getAllUcs); 

router.get("/abc", Controller.getAllUcs1); 

router.get("/code", Controller.getUcsInLocationsButNotInDb); 


router.get("/:id", Controller.getUcById); 
router.put("/:id", Controller.updateUc); 
router.delete("/:id", Controller.deleteUc); 

module.exports = router;
