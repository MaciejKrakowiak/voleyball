const Sequelize = require('sequelize');

const PGCONN = 'postgresql://voleyball_owner:dYyfsMo0bWK2@ep-orange-flower-a29z4j7l.eu-central-1.aws.neon.tech/voleyball?sslmode=require';

const sequelize = new Sequelize(PGCONN, {
  dialect: 'postgres',
  logging: false
});

module.exports = sequelize;
