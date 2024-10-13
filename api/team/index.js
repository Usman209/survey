const express = require('express');
const router = express.Router();
const teamController = require('./controller'); 
const { authenticateAndAuthorize } = require('../../lib/utils/verifyToken');
const { EUserRole } = require('../../lib/utils/enum');


// router.get('/', authenticateAndAuthorize([EUserRole.ADMIN,EUserRole.UCMO]),teamController.getAllTeams);



router.post('/', teamController.createTeam);
router.get('/',teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);
router.put('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);
router.post('/add-flw', teamController.addFLWToTeam);
router.post('/remove-flw', teamController.removeFLWFromTeam);
router.get('/team/search', teamController.searchTeams); 

router.get('/team/all', teamController.getTeamsByUcmo); 


router.get('/user/:id', teamController.getTeamDetailsByUserId); 






module.exports = router;


