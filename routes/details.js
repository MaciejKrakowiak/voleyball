const express = require('express');
const Match = require('../models/match');
const router = express.Router();

router.get('/', async (req, res) => {
    const matchId = req.query.id; 
    
    try {
      const match = await Match.findByPk(matchId);
      if (!match) {
        return res.status(404).send('Match not found');
      }
      res.render('details', { match });
    } catch (error) {
      res.status(500).json({ error: 'Error download match details' });
    }
  });

  //Endpoint to add point as well as start match if score is 0:0
  router.post('/add-point', async (req, res) => {
    const matchId = req.body.id;
    const teamName = req.body.team_name; 
    //Finding match in db
    try {
      const match = await Match.findByPk(matchId);
      if (!match) {
        return res.status(404).send('Match not found');
      }
  
      //Cheking if its tie break
      const matchResult = match.result;
      let [matchAScore, matchBScore] = matchResult.split(':').map(Number);
      const tie_break = (matchAScore==2 && matchBScore == 2)

      //Adding point and checking if conditions for ending set are true
      const lastResult = match.resultDetailed.resD[match.resultDetailed.resD.length - 1];
      let [teamAScore, teamBScore] = lastResult.split(':').map(Number);
  
      if (teamName === match.teamA_name) {
        teamAScore += 1;
      } else if (teamName === match.teamB_name) {
        teamBScore += 1;
      } else {
        return res.status(400).send('Invalid team name');
      }
      match.resultDetailed.resD[match.resultDetailed.resD.length - 1] = `${teamAScore}:${teamBScore}`;
      var set_over = false;
      if(tie_break){
        if((teamAScore === 8 && teamBScore < 8) || (teamBScore === 8 && teamAScore < 8)){
          activeMatches[matchId].flag = !activeMatches[matchId].flag;
          io.to(`match-${matchId}`).emit('change-position', activeMatches[matchId].flag);
        }
        set_over = (teamAScore>=15||teamBScore>=15) && Math.abs(teamAScore-teamBScore)>=2;
      }
      else{
        set_over = (teamAScore>=25||teamBScore>=25) && Math.abs(teamAScore-teamBScore)>=2;
      }
      

      //Checking if match should be added to current running matches and setting its date for date of start
      let shouldUpdateStatus = false;
      if (!activeMatches[matchId]) {
          match.date = new Date();
          shouldUpdateStatus = true;
          activeMatches[matchId] = {flag: false};
      }
      else if(activeMatches[matchId]){
        if(!activeMatches[matchId].startTime){
          match.date = new Date();
          shouldUpdateStatus = true;
        }
      }


      //Updating match in db
      await Match.update(
        {
          resultDetailed: match.resultDetailed,
            status: 'IN_PROGRESS',
            date: match.date,
        },
        { where: { id: matchId } }
    );


    //Setting timer for match time and current time
    if (shouldUpdateStatus) {
        //Updating match for all users on main page
        io.emit('match-updated');
        activeMatches[matchId] = {
          startTime: new Date(match.date).getTime(),
          interval: setInterval(() => {
            const currentTime = new Date();
            const matchStartTime = activeMatches[matchId].startTime;
  
            if (matchStartTime) {
              const elapsedGameTime = currentTime.getTime() - matchStartTime;
              io.to(`match-${matchId}`).emit('time-update', {
                currentTime,
                elapsedGameTime
              });
            }
          }, 1000)
        };
      }


      //Seting timer for current set
      if (activeMatches[matchId]) {
        if(!activeMatches[matchId].setStartTime){
          activeMatches[matchId].setStartTime = new Date().getTime();
          activeMatches[matchId].setInterval = setInterval(() => {
            const currentTime = new Date();
            const setStartTime = activeMatches[matchId].setStartTime;

            if (setStartTime) {
                const elapsedSetTime = currentTime.getTime() - setStartTime;
                io.to(`match-${matchId}`).emit('set-time-update', {
                    elapsedSetTime
                });
              }
            }, 1000);
        }
      }
  

      //Sending update for current room
      io.to(`match-${matchId}`).emit('details-updated', {match,set_over});
    } catch (error) {
      console.error('Error updating match score:', error);
      res.status(500).json({ error: 'Error updating match score' });
    }
  });

  //Endpoint to subtract points
  router.post('/minus-point', async (req, res) => {
    const matchId = req.body.id;
    const teamName = req.body.team_name; 
    
    //Finding match in db
    try {
      const match = await Match.findByPk(matchId);
      if (!match) {
        return res.status(404).send('Match not found');
      }

       //Cheking if its tie break
       const matchResult = match.result;
       let [matchAScore, matchBScore] = matchResult.split(':').map(Number);
       const tie_break = (matchAScore==2 && matchBScore == 2);
  
      //Subtracting points and checking if set can be over
      const lastResult = match.resultDetailed.resD[match.resultDetailed.resD.length - 1];
      let [teamAScore, teamBScore] = lastResult.split(':').map(Number);
      if (teamName === match.teamA_name && teamAScore>=1) {
        teamAScore -= 1;
      } else if (teamName === match.teamB_name&& teamBScore>=1) {
        teamBScore -= 1;
      } else {
        return res.status(400).send('Invalid team name');
      }
      match.resultDetailed.resD[match.resultDetailed.resD.length - 1] = `${teamAScore}:${teamBScore}`;

      //Checking set over and tie break flag
      var set_over = false;
      if(tie_break){
        if((teamAScore === 7 && teamBScore < 8) || (teamBScore === 7 && teamAScore < 8)){
          activeMatches[matchId].flag = !activeMatches[matchId].flag;
          io.to(`match-${matchId}`).emit('change-position', activeMatches[matchId].flag);
        }
        set_over = (teamAScore>=15||teamBScore>=15) && Math.abs(teamAScore-teamBScore)>=2;
      }
      else{
        set_over = (teamAScore>=25||teamBScore>=25) && Math.abs(teamAScore-teamBScore)>=2;
      }

      //Updating match in db
      await Match.update(
        {
          resultDetailed: match.resultDetailed,
        },
        { where: { id: matchId } }
    );
  
    //Sending uppdate signal to users in current match
    io.to(`match-${matchId}`).emit('details-updated', {match,set_over});
    } catch (error) {
      console.error('Error updating match score:', error);
      res.status(500).json({ error: 'Error updating match score' });
    }
  });

  //Endpoint to chandle ending set
  router.post('/end-set', async (req, res) => {
    const matchId = req.body.id; 
    
    //Finding match in db
    try {
      const match = await Match.findByPk(matchId);
      if (!match) {
        return res.status(404).send('Match not found');
      }
      
      //Adding point for result and cheking if game is over
      const lastResult = match.resultDetailed.resD[match.resultDetailed.resD.length - 1];
      let [teamAScore, teamBScore] = lastResult.split(':').map(Number);
      const set_over = false;

      const matchResult = match.result;
      let [matchAScore, matchBScore] = matchResult.split(':').map(Number);
      if(teamAScore>teamBScore){
        matchAScore +=1;
      } else if (teamBScore>teamAScore) {
        matchBScore+=1;
      }
      const match_over = (matchAScore>=3 || matchBScore>=3);
      match.result = `${matchAScore}:${matchBScore}`;
      //Expanding table with sets results
      match.resultDetailed.resD.push('0:0');

      //Rotating teams between sets
      activeMatches[matchId].flag = !activeMatches[matchId].flag;


      //Deleting interval for set timer
      if (activeMatches[matchId]) {
        clearInterval(activeMatches[matchId].setInterval);
        activeMatches[matchId].setStartTime = null;
        activeMatches[matchId].setInterval = null;
      }

      //Updating match in db
      await Match.update(
        {
          resultDetailed: match.resultDetailed,
          result: match.result,
        },
        { where: { id: matchId } }
    );
  

    //Sending update to users in room
    if((matchAScore+matchBScore)!=4){
      io.to(`match-${matchId}`).emit('change-position', activeMatches[matchId].flag);
    }
    io.to(`match-${matchId}`).emit('details-updated', {match,set_over,match_over});
    } catch (error) {
      console.error('Error updating match score:', error);
      res.status(500).json({ error: 'Error updating match score' });
    }
  });


  //Endpoint to chandle ending match
  router.post('/end-match', async (req, res) => {
    const matchId = req.body.id;  

    //Finding match
    try {
      const match = await Match.findByPk(matchId);
      if (!match) {
        return res.status(404).send('Match not found');
      }

      //Deleting excesive instance in table off sets results
      match.resultDetailed.resD.pop();

      //Updating match in db
      await Match.update(
        {
          status: 'FINISHED',
          resultDetailed: match.resultDetailed
        },
        { where: { id: matchId } }
    );

    //Clearing interval for match time and current time as well as deleting match form active matches
    if (activeMatches[matchId]) {
      clearInterval(activeMatches[matchId].interval);
      delete activeMatches[matchId];
    }

    //emiting signal for all users taht match is changed and redirecting all users form game room to main page
    io.emit('match-updated');
    io.to(`match-${matchId}`).emit('end-match');
    } catch (error) {
      console.error('Error updating match score:', error);
      res.status(500).json({ error: 'Error updating match score' });
    }
  });

  //Endpoint to switch team sides
  router.post('/swap', async (req, res) => {
    const matchId = req.body.id;  
    try {
      //creating flag in active matches or switching it
      if(!activeMatches[matchId]){
        activeMatches[matchId] = {flag: true};
      }
      else{
        activeMatches[matchId].flag = !activeMatches[matchId].flag;
      }
      io.to(`match-${matchId}`).emit('change-position', activeMatches[matchId].flag);
    } catch (error) {
      console.error('Error updating match score:', error);
      res.status(500).json({ error: 'Error updating match score' });
    }
  });

  module.exports = router;