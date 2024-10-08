const express = require('express');
const router = express.Router();
const teamController = require('./controller'); 

router.post('/', teamController.createTeam);
router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);
router.put('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);
router.post('/teams/add-flw', teamController.addFLWToTeam);
router.post('/teams/remove-flw', teamController.removeFLWFromTeam);


module.exports = router;
