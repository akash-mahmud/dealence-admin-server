module.exports = (sequelize, Sequelize) => {
  const BalanceUpdateLog = sequelize.define("balanceUpdateLog", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },

    balance: {
      type: Sequelize.REAL,
      allowNull: false,
    },
    date: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    contract: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  return BalanceUpdateLog;
};
