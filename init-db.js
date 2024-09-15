(async () => {
    const { sequelize } = require('./config');
    const Match = require('./models/match');
  
    await sequelize.sync({ force: true });
  
    await Match.bulkCreate([
      {
        date: '2024-07-02T20:00Z',
        teamA_name: 'Drużyna h',
        teamB_name: 'Drużyna j',
        result: '3:1',
        resultDetailed: { resD: ['25:23', '25:18', '25:21']},
        status: 'FINISHED',
      },
    ]);
  
    console.log('Dane przykładowe dodane');
  })();