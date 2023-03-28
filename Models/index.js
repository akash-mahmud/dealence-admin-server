const Sequelize = require("sequelize");

// const sequelize = new Sequelize('sqlite::memory:', { logging: false });

const sequelize = new Sequelize(
  "postgres://postgres:1234@localhost:5432/delance",
  { logging: false }
);

const UserModel = require("./users.model");

const AccountModel = require("./acount.model");
const NotificationModel = require("./Notification.model");
const InvestmentModel = require("./Investment.model");
const IncrementModel = require("./Increment.model");
const TransactionModel = require("./Transaction.model");
const PayoutModel = require("./Payout.model");
const EarnedModel = require("./Earned.model");
const AvailableCreditModel = require("./AvailableCredit.model");
const BalanceUpdateLogModel = require("./BalanceUpdateLog");
const TotalPaidModel = require("./TotalPaid.model");

const Earned = EarnedModel(sequelize, Sequelize);
const Investment = InvestmentModel(sequelize, Sequelize);
const Increment = IncrementModel(sequelize, Sequelize);
const Transaction = TransactionModel(sequelize, Sequelize);
const Payout = PayoutModel(sequelize, Sequelize);
const Notification = NotificationModel(sequelize, Sequelize);
const AvailableCredit = AvailableCreditModel(sequelize, Sequelize);
const BalanceUpdateLog = BalanceUpdateLogModel(sequelize, Sequelize);
const TotalPaid = TotalPaidModel(sequelize, Sequelize);
const User = UserModel(sequelize, Sequelize);
const Account = AccountModel(sequelize, Sequelize);

Account.belongsTo(User);
User.hasOne(Account);

Notification.belongsTo(User);
User.hasOne(Notification);

Investment.belongsTo(User);
User.hasOne(Investment);

Earned.belongsTo(User);
User.hasMany(Earned);

Investment.hasMany(Increment);
Increment.belongsTo(Investment);

User.hasMany(Increment);
Increment.belongsTo(User);

Transaction.belongsTo(User);
User.hasMany(Transaction);

User.hasMany(TotalPaid);
TotalPaid.belongsTo(User);
User.hasOne(AvailableCredit);
AvailableCredit.belongsTo(User);
User.hasMany(BalanceUpdateLog);
BalanceUpdateLog.belongsTo(User);
// An increment has many payouts (one per cycle)
// Payouts are associated with an user for easier
// retrieval
Payout.belongsTo(Increment);
Increment.hasMany(Payout);

Payout.belongsTo(User);
User.hasMany(Increment);

sequelize.sync().then(() => {});

module.exports = {
  User,
  Transaction,
  Investment,
  Increment,
  Account,
  Payout,
  Notification,
  Earned,
  AvailableCredit,
  BalanceUpdateLog,
  TotalPaid,
};

// I want to pass year as a filter on my sequalize. Then it should return the data in monthwise. For example January:{this month data}
