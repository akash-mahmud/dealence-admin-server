module.exports = (sequelize, Sequelize) => {
  const TotalPaid = sequelize.define("totalPaid", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },

    totalPaid: {
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

  return TotalPaid;
};
