module.exports = (sequelize, Sequelize) => {
  const AvailableCredit = sequelize.define("availableCredit", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },

    credit: {
      type: Sequelize.REAL,
      allowNull: false,
    },


    contract: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  return AvailableCredit;
};
