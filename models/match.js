const { DataTypes } = require('sequelize');
const sequelize  = require('../config');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  teamA_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  teamB_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  result: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resultDetailed: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PLANNED', 'IN_PROGRESS', 'FINISHED'),
    allowNull: false,
  },
}, {
  tableName: 'matches',
  timestamps: false,
});

module.exports = Match;
