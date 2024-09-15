const express = require('express');
const Match = require('../models/match');
const router = express.Router();

//Endpoint for rendering main page
router.get('/', async (req, res) => {
  const statusFilter = req.query.status;

  //Chandling filter options for matches 
  const validStatuses = ['PLANNED', 'IN_PROGRESS', 'FINISHED'];
  const whereClause = statusFilter && validStatuses.includes(statusFilter) ? { status: statusFilter } : {};
  
  //Getting matches by date and optional filter
  const matches = await Match.findAll({
    where: whereClause,
    order: [['date', 'DESC']],
  });
  
  res.render('matches', { matches, statusFilter });
});


//Endpoint for rendering form to add match
router.get('/add-match', async (req, res) => {
  res.render('add-match');
});

//Endpoint for adding match
router.post('/', async (req, res) => {
  const { date, teamA_name, teamB_name } = req.body;

  //Creating match
  try {
    const match = await Match.create({
      date: new Date(date),
      teamA_name,
      teamB_name,
      result: '0:0',
      resultDetailed: {'resD': ['0:0']},
      status: new Date(date) > new Date() ? 'PLANNED' : 'IN_PROGRESS',
    });

    //Emiting signal to users about match change
    io.emit('match-updated');
    res.redirect('/matches');
  } catch (error) {
    res.status(400).json({ error: 'Error creating match' });
  }
 
});

//Endpoint to deleting match
router.post('/delete', async (req, res) => {
  try {
    const matchId = req.body.id;
    //Finding match in db
    const match = await Match.findByPk(matchId);
    if (match) {
      //Clearing intervals of match and deleting it form active matches
      if (activeMatches[matchId]) {
        clearInterval(activeMatches[matchId].setInterval);
        activeMatches[matchId].setStartTime = null;
        activeMatches[matchId].setInterval = null;
        clearInterval(activeMatches[matchId].interval);
        delete activeMatches[matchId];
      }
      //Deleting match form db
      await match.destroy();

      //Informing clients about match deletion
      io.to(`match-${matchId}`).emit('end-match');
      io.emit('match-updated');
    }
    //Redirect to main page
    res.redirect('/matches');
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(400).json({ error: 'Error deleting match' });
  }
});

module.exports = router;