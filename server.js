// const express = require('express');
const express = require("express");
const moment = require("moment");
const {
  Transaction,
  Investment,
  Increment,
  Earned,
  Payout,
  AvailableCredit,
  BalanceUpdateLog,
  TotalPaid,
} = require("./Models");
const jwt = require("jsonwebtoken");
const transactionsType = require("./constants/transactionsType");
const plans = require("./constants/plans");
const cors = require("cors");
const Joi = require("joi");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const { User, Account } = require("./Models");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const saltRounds = 10;
// const myPlaintextPassword = '@#1Matteo254';

// bcrypt.hash(myPlaintextPassword, saltRounds, function (err, hash) {
//
// });
// $2b$10$KsURlwzDp/QfOhalteJcUe64TRFbGQAci4EzdLO.9MIDBSrp/kB2m
const Mailer = require("./utils/mailer");
dotenv.config();

// const { User, Account, Increment, Payout, Investment } = require('./models');

const path = require("path");

const app = express();
app.use(morgan("dev"));
const schema = Joi.object().keys({
  plan: Joi.string().valid(plans.BIMONTHLY, plans.SEMIANNUAL).required(),
  amount: Joi.number().required(),
  startDate: Joi.any(),
  contract: Joi.any(),
  reinvestIncome: Joi.boolean(),
});

const balanceLogSchema = Joi.object().keys({
  balance: Joi.number().required(),
  startDate: Joi.any(),
  contract: Joi.any(),
});

const totalPaidSchema = Joi.object().keys({
  totalPaid: Joi.number().required(),
  startDate: Joi.any(),
  contract: Joi.any(),
});

const availableCreditSchema = Joi.object().keys({
  credit: Joi.number().required(),
  startDate: Joi.any(),
  contract: Joi.any(),
});

// Allow larger JSON bodies to handle document verification,
// where documents are sent in base64 format
app.use(bodyParser.urlencoded({ limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
const admin = {
  email: process.env.ADMIN_EMAIL,
  password: "$2b$10$KsURlwzDp/QfOhalteJcUe64TRFbGQAci4EzdLO.9MIDBSrp/kB2m",
};

const verify = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(
      token,
      "$%myadmi@#kjnvxjkfrkeurfdgbfuhsdbfuhbg764526@!~@@#$%&*^^&*(fdsefcD$#W!@13%$d$#55dfvh@3",
      (err, user) => {
        if (err) {
          return res.status(403).send("Token is not valid");
        } else {
          req.user = user;
          next();
        }
      }
    );
  } else {
    return res.status(404).send("You are not authenticated");
  }
};

app.get("/api/users", verify, async (req, res) => {
  const users = await User.findAll({
    where: { isActive: false, isDocumentUploaded: true },
  });
  res.send(users);
});
app.post("/api/users/search", verify, async (req, res) => {
  const user = await User.findAll({
    where: { email: req.body.searchEmail },
  });
  res.send(user);
});

const getPagination = (page, size) => {
  const limit = size ? +size : 10;
  const offset = page ? page * limit : 0;
  return { limit, offset };
};
const getPagingData = (data, page, limit) => {
  const { count: totalItems, rows: users } = data;
  const currentPage = page ? +page : 0;
  const totalPages = Math.ceil(totalItems / limit);
  return { totalItems, users, totalPages, currentPage };
};

app.get("/api/users/verified", verify, async (req, res) => {
  // const users = await User.findAll({
  //   where: { isActive: true, isDocumentUploaded: true },
  // });
  // res.send(users);
  const condition = { isActive: true, isDocumentUploaded: true };
  const { page, size } = req.query;
  const { limit, offset } = getPagination(page, size);

  const users = await User.findAndCountAll({
    where: condition,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const response = getPagingData(users, page, limit);
  res.send(response);
});

app.get("/api/users/verified/:id", verify, async (req, res) => {
  const user = await User.findAll({
    where: { id: req.params.id },
  });
  res.send(user);
});

app.get("/api/balancelog/:id", verify, async (req, res) => {
  const balanceUpdateLogs = await BalanceUpdateLog.findAll();
  res.json(balanceUpdateLogs);
});
app.get("/api/balancelog/:id/:balanceLogId", verify, async (req, res) => {
  const { balanceLogId } = req.params;
  const balanceUpdateLog = await BalanceUpdateLog.findOne({
    where: { id: balanceLogId },
  });
  res.json(balanceUpdateLog);
});
app.delete("/api/balancelog/:id/:balanceLogId", verify, async (req, res) => {
  const { balanceLogId } = req.params;
  await BalanceUpdateLog.destroy({
    where: {
      id: balanceLogId,
    },
  });
  res.sendStatus(204);
});
app.patch("/api/balancelog/:id/:balanceLogId", verify, async (req, res) => {
  const { id, balanceLogId } = req.params;
  const { balance, date, contract, userId } = req.body;
  const balanceUpdateLog = await BalanceUpdateLog.findOne({
    where: { id: balanceLogId },
  });
  await balanceUpdateLog.update({
    balance,
    date,
    contract,
    userId: id,
  });
  res.json(balanceUpdateLog);
});

app.post("/api/balancelog/:id", verify, async (req, res) => {
  const { balance, date, contract } = req.body;
  const balanceUpdateLog = await BalanceUpdateLog.create({
    balance,
    date,
    contract,
    userId: req.params.id,
  });
  res.json(balanceUpdateLog);
});

app.post("/api/user/transaction/add/:id", verify, async (req, res) => {
  // const user = await User.findAll({
  //   where: { id: req.params.id },
  // });
  const { startDate, amount } = req.body;

  await Transaction.create({
    userId: req.params.id,
    date: new Date(startDate),
    type: transactionsType.DEPOSIT,
    amount: amount,
  });

  await Account.increment("balance", {
    by: parseFloat(amount),
    where: { userId: req.params.id },
  });
  return res.send("success");
});

app.post("/api/user/update/details/:id", verify, async (req, res) => {
  const user = await User.findAll({
    where: { id: req.params.id },
  });
  const {
    first_name,
    last_name,
    email,
    phone_number,
    address,
    city,
    state,
    zip,
    country,
    contracts,
  } = req.body;

  if (user) {
    await User.update(
      {
        first_name: first_name,
        last_name: last_name,
        email: email,
        phone_number: phone_number,
        address: address,
        state: state,
        city: city,
        zip: zip,
        country: country,
        contracts,
      },
      { where: { id: req.params.id } }
    );

    return res.send("success");
  }

  // return res.send('success');
});

app.get("/api/user/investment/list/:id", verify, async (req, res) => {
  const user = await User.findAll({
    where: { id: req.params.id },
  });

  var investment = await Investment.findOne({
    where: { userId: req.params.id },
  });

  const increments = await Increment.findAll({
    order: [["createdAt", "ASC"]],
    where: { userId: req.params.id },
  });

  if (increments.length > 0) {
    const principal = increments
      .reduce((prev, curr) => prev + curr.principal, 0.0)
      .toFixed(2);

    return res.status(202).send({
      createdAt: investment.createdAt,
      id: investment.id,
      reinvestIncome: investment.reinvestIncome,
      tacitRenewal: investment.tacitRenewal,
      updatedAt: investment.updatedAt,
      userId: investment.userId,
      principal: principal,
      plan: increments[0].plan,
    });
  } else {
    return res.status(202).send("");
  }
  // return res.send('success');
});

// /api/user/transaction/add/${id}

app.post("/api/users", verify, async (req, res) => {
  const user = await User.findOne({ where: { id: req.body.id } });

  if (!user) {
    res.send("User does not exists");
  }
  if (user.dataValues.isDocumentUploaded === false) {
    res.status(403).send("User does not exists");
  }

  if (user) {
    await User.update(
      {
        isActive: true,
      },
      { where: { id: req.body.id } }
    );

    const mailer = new Mailer();
    let documentApprove = await mailer.getUpAprooveInfoMail(user);
    try {
      await mailer.sendMailSync(documentApprove);

      res.send({ message: "User updated successfully" });
    } catch (error) {
      const errorString = `Error sending email: ${error}`;

      res.send({ message: errorString });
    }
  }
});

app.get("/api/user/account/:id", verify, async (req, res) => {
  var account = await Account.findOne({
    where: {
      userId: req.params.id,
    },
  });
  const payouts = await Payout.findAll({
    where: { userId: req.params.id },
  });
  const interestEarned = payouts
    .reduce((prev, curr) => prev + curr.amount, 0.0)
    .toFixed(2);

  res.send({
    balance: account.balance,
    credit: account.availableCredit,
    interestEarned: interestEarned,
  });
});

// /api/user/plan/create/${id}
app.post("/api/user/plan/create/:id", verify, async (req, res) => {
  let { startDate, amount } = req.body;
  amount = parseInt(amount);
  var account = await Account.findOne({
    where: {
      userId: req.params.id,
    },
  });

  var investments = await Investment.findAll({
    where: { userId: req.params.id },
  });

  if (investments.length > 0) {
    res.send("Investment already present. Please update instead");
  } else {
    const validBody = schema.validate(req.body);

    if (validBody.error == null) {
      // Create investment object
      const initialInvestment = await Investment.create({
        userId: req.params.id,
        reinvestIncome: req.body.reinvestIncome,
        createdAt: new Date(startDate),
        updatedAt: new Date(startDate),
      });
      await Earned.create({
        plan: req.body.plan,
        principal: parseFloat(req.body.amount),
        startDate: new Date(startDate),
        userId: req.params.id,
        investmentId: initialInvestment.id,
        createdAt: new Date(startDate),
        updatedAt: new Date(startDate),
      });
      // Create initial increment
      await Increment.create({
        plan: req.body.plan,
        principal: parseFloat(req.body.amount),
        startDate: new Date(startDate),
        createdAt: new Date(startDate),
        updatedAt: new Date(startDate),
        userId: req.params.id,
        investmentId: initialInvestment.id,
        contract: req.body.contract,
      });

      res.send("success");
    } else {
      res.send("Bad request");
    }
  }
});

// create balance log
app.post("/api/user/balancelog/create/:id", verify, async (req, res) => {
  let { startDate, balance, contract } = req.body;
  balance = parseInt(balance);

  try {
    const validBody = balanceLogSchema.validate(req.body);
    if (validBody.error == null) {
      await BalanceUpdateLog.create({
        balance: balance,
        date: new Date(startDate),
        contract: contract,
        createdAt: new Date(startDate),
        updatedAt: new Date(startDate),
        userId: req.params.id,
      });

      res.send("success");
    }
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

// create totalpaid
app.post("/api/user/totalpaid/create/:id", verify, async (req, res) => {
  let { startDate, totalPaid, contract } = req.body;
  totalPaid = parseFloat(req.body.totalPaid);

  try {
    const validBody = totalPaidSchema.validate(req.body);
    if (validBody.error == null) {
      await TotalPaid.create({
        totalPaid: totalPaid,
        date: new Date(startDate),
        contract: contract,
        createdAt: new Date(startDate),
        updatedAt: new Date(startDate),
        userId: req.params.id,
      });

      res.send("success");
    }
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

// create availablecredit
app.post("/api/user/availablecredit/create/:id", verify, async (req, res) => {
  let { startDate, credit, contract } = req.body;
  const { id } = req.params;
  credit = parseFloat(req.body.credit);

  try {
    const validBody = availableCreditSchema.validate(req.body);
    console.log(validBody);
    if (validBody.error == null) {
      await AvailableCredit.create({
        credit: credit,
        contract: contract,
        createdAt: new Date(startDate),
        updatedAt: new Date(startDate),
        userId: id,
      });

      res.send("success");
    }
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.post("/api/user/data/withdraw/payOut/:id", verify, async (req, res) => {
  let { startDate, amount } = req.body;
  amount = parseInt(amount);

  var account = await Account.findOne({
    where: {
      userId: req.params.id,
    },
  });
  if (amount <= account.availableCredit) {
    await Transaction.create({
      userId: req.params.id,
      date: new Date(startDate),
      createdAt: new Date(startDate),
      updatedAt: new Date(startDate),
      type: transactionsType.WITHDRAWAL,
      amount: amount,
      iban: "Added by admin",
    });

    await Account.decrement("availableCredit", {
      by: amount,
      where: { userId: req.params.id },
    });

    return res.status(201).send("success");
  } else {
    res.send("Not enough balance");
  }
});

app.post("/api/user/data/withdraw/balance/:id", verify, async (req, res) => {
  let { amount } = req.body;
  amount = parseInt(amount);

  var account = await Account.findOne({
    where: {
      userId: req.params.id,
    },
  });
  if (amount <= account.balance) {
    await Account.decrement("balance", {
      by: amount,
      where: { userId: req.params.id },
    });

    return res.status(201).send("success");
  } else {
    res.send("Not enough balance");
  }
});

app.post(
  "/api/user/data/decrease/balance/data/:id",
  verify,
  async (req, res) => {
    let { amount } = req.body;
    amount = parseInt(amount);

    var account = await Account.findOne({
      where: {
        userId: req.params.id,
      },
    });
    if (amount <= account.balance) {
      await Account.decrement("balance", {
        by: amount,
        where: { userId: req.params.id },
      });

      return res.status(201).send("success");
    } else {
      res.send("Your entered amount is bigger than his balance");
    }
  }
);

app.post(
  "/api/user/data/decrease/payout/data/:id",
  verify,
  async (req, res) => {
    let { amount } = req.body;
    amount = parseInt(amount);

    var account = await Account.findOne({
      where: {
        userId: req.params.id,
      },
    });
    if (amount <= account.availableCredit) {
      await Account.decrement("availableCredit", {
        by: amount,
        where: { userId: req.params.id },
      });

      return res.status(201).send("success");
    } else {
      res.send("Your entered amount is bigger than his total payout");
    }
  }
);

// plans
const getPagingDataResponse = (data, page, limit) => {
  const { count: totalItems, rows: increment } = data;
  const currentPage = page ? +page : 0;
  const totalPages = Math.ceil(totalItems / limit);
  return { totalItems, increment, totalPages, currentPage };
};

app.get("/api/users/verified/plans/:id", verify, async (req, res) => {
  // const users = await User.findAll({
  //   where: { isActive: true, isDocumentUploaded: true },
  // });
  // res.send(users);
  const condition = { userId: req.params.id };
  const { page, size } = req.query;
  const { limit, offset } = getPagination(page, size);

  const plansData = await Increment.findAndCountAll({
    where: condition,
    order: [["createdAt", "ASC"]],
    limit,
    offset,
  });

  // let plans = [];
  // for (const plans of plansData) {
  //   plans.push({
  //     id: plans.id,
  //     createdAt: moment(plans.createdAt).format("DD/MM/YYYY"),
  //     plan: plans.plan,
  //     principal: plans.principal,
  //     // daysUntilPayout: daysUntilNextPayout(increment),
  //     // interest: payoutForIncrement(increment).toFixed(2)
  //   })
  // }

  const response = getPagingDataResponse(plansData, page, limit);

  res.send(response);
});

app.get("/api/users/verified/plan/:id/:contract", verify, async (req, res) => {
  const condition = { userId: req.params.id, contract: req.params.contract };

  const planData = await Increment.findOne({
    where: condition,
  });

  res.send(planData);
});

app.get("/api/users/verified/balancelogs/:id", verify, async (req, res) => {
  const condition = { userId: req.params.id };
  const { page, size } = req.query;
  const { limit, offset } = getPagination(page, size);

  const plansData = await BalanceUpdateLog.findAndCountAll({
    where: condition,
    order: [["createdAt", "ASC"]],
    limit,
    offset,
  });

  const response = getPagingDataResponse(plansData, page, limit);

  res.send(response);
});

app.get("/api/users/verified/totalpaids/:id", verify, async (req, res) => {
  const condition = { userId: req.params.id };
  const { page, size } = req.query;
  const { limit, offset } = getPagingData(page, size);

  const plansData = await TotalPaid.findAndCountAll({
    where: condition,
    order: [["createdAt", "ASC"]],
    limit,
    offset,
  });

  const response = getPagingDataResponse(plansData, page, limit);

  res.send(response);
});

app.get(
  "/api/users/verified/availablecredits/:id/:contract",
  verify,
  async (req, res) => {
    const { id, contract } = req.params;
    const { page, size } = req.query;
    const { limit, offset } = getPagingData(page, size);

    const plansData = await AvailableCredit.findAndCountAll({
      where: { userId: id, contract: `#${contract}` },
      order: [["createdAt", "ASC"]],
      limit,
      offset,
    });

    const response = getPagingDataResponse(plansData, page, limit);

    res.send(response);
  }
);

// delete plan
app.delete("/api/users/verified/plan/delete/:id", verify, async (req, res) => {
  // const users = await User.findAll({
  //   where: { isActive: true, isDocumentUploaded: true },
  // });
  // res.send(users);

  const condition = { id: req.params.id };
  const data = await Increment.findAll({
    where: condition,
  });
  console.log(data);

  const deleted = await Increment.destroy({
    where: condition,
  });

  res.status(201).send("success");
});

//delete balancelog
app.delete(
  "/api/users/verified/balancelog/delete/:id",
  verify,
  async (req, res) => {
    await BalanceUpdateLog.destroy({
      where: { id: req.params.id },
    });

    res.status(201).send("success");
  }
);

//delete balancelog
app.delete(
  "/api/users/verified/totalpaid/delete/:id",
  verify,
  async (req, res) => {
    await TotalPaid.destroy({
      where: { id: req.params.id },
    });

    res.status(201).send("success");
  }
);

//delete availablecredit
app.delete(
  "/api/users/verified/availablecredit/delete/:id",
  verify,
  async (req, res) => {
    await AvailableCredit.destroy({
      where: { id: req.params.id },
    });

    res.status(201).send("success");
  }
);

app.post("/api/user/data/add/payout/direct/:id", verify, async (req, res) => {
  let { amount } = req.body;
  amount = parseFloat(amount);

  var account = await Account.findOne({
    where: {
      userId: req.params.id,
    },
  });
  // if (amount <= account.balance) {
  //   await Account.decrement('balance', {
  //     by: amount,
  //     where: { userId: req.params.id },
  //   });

  //   return res.status(201).send('success');
  // } else {
  account.availableCredit += amount;

  await account.save();
  return res.status(201).send("success");
  // }
});

app.post("/api/user/editPlan/:id/:incrementId", verify, async (req, res) => {
  console.log(req.body);
  let { startDate, amount, contract, plan } = req.body;
  const { id, incrementId } = req.params;
  amount = parseInt(amount);

  var investments = await Investment.findAll({
    where: { userId: id },
  });

  if (investments.length > 0) {
    const validBody = schema.validate(req.body);

    if (validBody.error == null) {
      // Update investment object
      const initialInvestment = await Investment.findOne({
        userId: id,
      });

      await initialInvestment.update({
        updatedAt: new Date(startDate),
      });
      const increment = await Increment.findOne({
        where: {
          id: incrementId,
        },
      });
      // await earned.update({
      //   plan: plan,
      //   principal: amount,
      //   startDate: new Date(startDate),
      //   investmentId: initialInvestment.id,
      //   createdAt: new Date(startDate),
      //   updatedAt: new Date(startDate),
      // });
      // Update initial increment
      await increment.update({
        plan: plan,
        principal: amount,
        startDate: new Date(startDate),
        updatedAt: new Date(startDate),
        contract: contract,
      });

      res.send("success");
    } else {
      res.send("Bad request");
    }
  }
});

// edit balance log
app.post("/api/user/edittotalpaid/:id", verify, async (req, res) => {
  let { startDate, totalPaid, contract } = req.body;
  const { id } = req.params;
  totalPaid = parseFloat(totalPaid);

  try {
    const validBody = totalPaidSchema.validate(req.body);

    if (validBody.error == null) {
      // Update balancelog object
      const totalpaid = await TotalPaid.findOne({
        where: {
          userId: id,
        },
      });
      await totalpaid.update({
        totalPaid: totalPaid,
        updatedAt: new Date(startDate),
        contract: contract,
      });

      res.send("success");
    }
  } catch (err) {
    res.send(err.message);
  }
});

// edit balance log
app.post("/api/user/editbalancelog/:id", verify, async (req, res) => {
  let { startDate, balance, contract } = req.body;
  const { id } = req.params;
  balance = parseInt(balance);

  try {
    const validBody = balanceLogSchema.validate(req.body);

    if (validBody.error == null) {
      // Update balancelog object
      const balanceLog = await BalanceUpdateLog.findOne({
        where: {
          userId: id,
        },
      });
      console.log(balanceLog);
      await balanceLog.update({
        balance: balance,
        updatedAt: new Date(startDate),
        contract: contract,
      });

      res.send("success");
    }
  } catch (err) {
    res.send(err.message);
  }
});

// edit availablecredit log
app.post("/api/user/editavailablecredit/:id", verify, async (req, res) => {
  let { startDate, credit, contract } = req.body;
  const { id } = req.params;
  credit = parseFloat(credit);

  try {
    const validBody = availableCreditSchema.validate(req.body);

    if (validBody.error == null) {
      // Update balancelog object
      const availableCredit = await AvailableCredit.findOne({
        where: {
          userId: id,
        },
      });

      await availableCredit.update({
        credit: credit,
        updatedAt: new Date(startDate),
        contract: contract,
      });

      res.send("success");
    }
  } catch (err) {
    res.send(err.message);
  }
});

app.post("/api/user/updatePlan/:id", verify, async (req, res) => {
  let { startDate, amount } = req.body;
  amount = parseInt(amount);
  var account = await Account.findOne({
    where: {
      userId: req.params.id,
    },
  });

  const validBody = schema.validate(req.body);

  if (validBody.error == null) {
    var investment = await Investment.findOne({
      where: { userId: req.params.id },
    });

    if (investment == null) {
      res.status(400).send({
        message: "User has no investment yet. Please create one first",
      });

      return;
    }
    await Earned.create({
      plan: req.body.plan,
      principal: parseFloat(req.body.amount),
      startDate: new Date(startDate),
      createdAt: new Date(startDate),
      updatedAt: new Date(startDate),
      userId: req.params.id,
      investmentId: investment.id,
    });

    const daysElapsed = moment(new Date()).diff(investment.createdAt, "days");
    const increments = await Increment.findAll({
      order: [["createdAt", "ASC"]],
      where: { userId: req.params.id },
    });

    if (increments.length == 1 && daysElapsed <= 15) {
      // If the user has only made a single investment
      // and less than 15 days have passed update the
      // first increment's principal, plan and start
      // date
      const firstIncrement = increments[0];

      await firstIncrement.update({
        plan: req.body.plan,
        principal: firstIncrement.principal + parseFloat(req.body.amount),
        startDate: new Date(startDate),
        createdAt: new Date(startDate),
        contract: req.body.contract,
      });
    } else {
      // If more than 15 days have elapsed or the user
      // has more than a single increment create a new
      // increment with the invested amount as the principal
      await Increment.create({
        plan: req.body.plan,
        principal: parseFloat(req.body.amount),
        startDate: new Date(startDate),
        createdAt: new Date(startDate),
        updatedAt: new Date(startDate),
        userId: req.params.id,
        investmentId: investment.id,
        contract: req.body.contract,
      });
    }

    await Account.decrement("balance", {
      by: req.body.amount,
      where: { userId: req.params.id },
    });

    res.send({
      message: "success",
    });
  } else {
    res.status(400).send({
      message: "invalid payload",
    });
  }
});

app.post("/api/user/investment/list/:id", verify, async (req, res) => {
  console.log("hi");
  const investment = await Investment.findOne({
    where: { userId: req.params.id },
  });
  res.send(investment);
});
app.post("/api/users/discard", verify, async (req, res) => {
  const user = await User.findOne({ where: { id: req.body.id } });
  const mailer = new Mailer();
  let documentDiscard = await mailer.getUpDAteInfoMail(user);
  try {
    await mailer.sendMailSync(documentDiscard);

    res.send({ message: "User update mail send" });
  } catch (error) {
    const errorString = `Error sending email: ${error}`;

    res.send({ message: errorString });
  }
});

app.post("/api/users/login", async (req, res) => {
  console.log(process.emit.ADMIN_EMAIL);
  if (!req.body) {
    return res.send("Enter Data properly");
  }

  if (req.body.email !== process.env.ADMIN_EMAIL) {
    return res.status(404).send("Invalid Credential");
  } else {
    bcrypt.compare(req.body.password, admin.password, function (err, result) {
      if (result === false) {
        return res.status(404).send("Invalid Credential");
      } else {
        const accesToken = jwt.sign(
          { email: admin.email },
          "$%myadmi@#kjnvxjkfrkeurfdgbfuhsdbfuhbg764526@!~@@#$%&*^^&*(fdsefcD$#W!@13%$d$#55dfvh@3"
          // ,

          // { expiresIn: '10h' }
        );
        return res.send({
          email: admin.email,
          token: accesToken,
        });
      }
    });
  }
  // else {
  //   return res.status(404).send('Invalid Credential');
  // }
});

app.use(express.static(path.join(__dirname, "frontend", "build")));

app.use("/employee", express.static(path.join(__dirname, "frontend", "build")));
app.use(
  "/employee/",
  express.static(path.join(__dirname, "frontend", "build"))
);

// /employee/login
app.get("/employee", function (req, res) {
  res.redirect("/employee/login");
});
app.get("/employee/*", function (req, res) {
  res.sendFile(path.join(__dirname, "frontend", "build", "index.html"));
});
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "frontend", "build", "index.html"));
});

const port = process.env.PORT || 4001;

app.listen(port, async () => {
  console.log(`The server is running on: http://localhost:${port}`);
});
