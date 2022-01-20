const AudioBook = require("../models/audiobooks");
const config = require("../config.json");
var mongoose = require("mongoose");
const dev_db_url = config.db.url;
const _ = require("lodash");
// const Cart = require("../models/cart");
const Orders = require("../models/order");
const idGenerator = require("mongo-incremental-id-generator")(dev_db_url);
const Razorpay = require("razorpay");
const crypto = require("crypto");
// console.log(config, "CONFIG");

const { ObjectId } = require("mongoose").Types;
const instance = new Razorpay({
  key_id: config.razorpay.key,
  key_secret: config.razorpay.secret,
});

let name = null;

function convertParams(model, params) {
  name = null;
  const finalQuery = {};
  const keys = _.keys(model.schema.obj);
  const query = _.keys(params);
  const final = _.intersectionWith(query, keys);
  const options = ["_ne", "_lt", "_gt", "_lte", "_gte"];
  finalQuery.find = {};
  finalQuery.where = {};
  finalQuery.sort = {};
  finalQuery.start = 0;
  finalQuery.limit = 1000;

  _.map(query, (q) => {
    _.map(options, (option) => {
      if (_.includes(q, option)) {
        var newQuery = {};
        newQuery[option.replace("_", "$")] = params[q];
        finalQuery.where[q.replace(option, "")] = newQuery;
      } else if (_.includes(q, "_sort")) {
        var actualQuery = params[q].split(":");
        finalQuery.sort[actualQuery[0]] = actualQuery[1];
      } else if (_.includes(q, "_start")) {
        finalQuery.start = (parseInt(params[q]) - 1) * parseInt(params._limit);
      } else if (_.includes(q, "_limit")) {
        finalQuery.limit = parseInt(params[q]);
      }
    });
  });
  _.map(final, (f) => {
    
    if (f === "name") {
      name = params[f]; //{ $regex: `^${params[f]}`, $options: "i" };
    } else {
      finalQuery.where[f] = params[f];
    }
  });
  _.map(query, (f) => {
    if (f === "type") {
      finalQuery.where[f] = params[f];
    }
    if (f === "name") {
      name = params[f]; //{ $regex: `^${params[f]}`, $options: "i" };
    }
  });
  if (params.keyword) {
    const $or = [
      { serviceUser: { $regex: `^${params.keyword}`, $options: "i" } },
      { form_id: { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
}

exports.list = async function (req, res) {
  const filters = await convertParams(Orders, req.query);
  const { body, user } = req;
  // console.log(filters, 'order filter')
  Orders.find(filters.find)
    .where(filters.where)
    .populate("user")
    .populate("audiobook")
    .populate({
      path: "audiobook",
      populate: {
        path: "author",
        model: "Party",
      },
    })
    .populate({
      path: "audiobook",
      populate: {
        path: "narratedBy",
        model: "Party",
      },
    })
    .populate({
      path: "audiobook",
      populate: {
        path: "publishedBy",
        model: "Party",
      },
    })
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, order) {
      if (err) {
        return res.status(400).send(err);
      }
      // console.log(order, "OLO");
      Orders.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Parameters are not valid" });
          }

          let newOrder;
          // console.log(name,'NAME');
          if (name) {
            newOrder = [];
            order.map((item) => {
              if (
                item.user.name &&
                item.user.name.search(new RegExp(name, "i")) > -1
              ) {
                newOrder.push(item);
              }
            });
          } else {
            newOrder = order;
          }

          const orderList = {
            order: newOrder,
            orderCount: newOrder.length,
            total: count,
          };
          // console.log(orderList,'OL')

          res.status(200).send(orderList);
        },
      );
    });
};

exports.findOne = function (req, res) {
  const { params } = req;
  Orders.findOne({ _id: params.id })
    .populate("user")
    .populate("audiobook")
    .populate({
      path: "audiobook",
      populate: {
        path: "author",
        model: "Party",
      },
    })
    .populate({
      path: "audiobook",
      populate: {
        path: "narratedBy",
        model: "Party",
      },
    })
    .populate({
      path: "audiobook",
      populate: {
        path: "publishedBy",
        model: "Party",
      },
    })
    .exec(function (err, order) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      // console.log(order)
      if (order) res.send(order);
      else res.send({ message: "Document Not Found" });
    });
};

exports.create = async function (req, res) {
  const { body } = req;
  // console.log(body, "BODY");
  body.user = req.user._id;
  // console.log("Launching IDGenerator");
  await idGenerator.generateId("recieptId", 00001, function (err, id) {
    if (err) {
      res.status(400).send({ message: "Bad Request" });
    } else {
      // console.log("Creating payParams");
      const payParams = {
        amount: body.amount * 100,
        currency: body.currency,
        receipt: id,
        payment_capture: "1",
      };
      // console.log("Creating Order ID");
      instance.orders
        .create(payParams)
        .then((data) => {
          // console.log(data);
          // const arr = {
          //   ...body,
          //   order_id: data.id,
          //   userId: body.user,
          // };

          // console.log("Sending Data", data);
          res.status(200).json({ data, key: config.razorpay.key });
          // Orders.create(arr, (err, order) => {
          //   if (err) {
          //     console.log("Order not created");
          //   } else {
          //     res.status(200).json({ order, data, key: config.razorpay.key });
          //   }
          // });
        })
        .catch((error) => {
          console.log(error, "ERR");
          res.send({ error, status: "failed" });
        });
    }
  });
};

exports.success = async function (req, res) {
  const { body } = req;
  const user = req.user._id;
  const orderraw = body.razorpayOrderId + "|" + body.razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", config.razorpay.secret)
    .update(orderraw.toString())
    .digest("hex");
  if (expectedSignature === body.razorpaySignature) {
    body.status = "Success";
    const arr = {
      audiobook: body.audiobook,
      currency: body.currency,
      amount: body.amount / 100,
      status: "Success",
      order_id: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      user: user,
    };
    Orders.create(arr, (err, order) => {
      if (err) {
        console.log(err, "ERR");
      } else {
        AudioBook.findOne({ _id: body.audiobook }).exec(function (
          err,
          updatedAudiobook,
        ) {
          if (err) {
            res.status(400);
            res.send(err);
          }
          updatedAudiobook.itemsSold = updatedAudiobook.itemsSold + 1;
          AudioBook.updateOne(
            { _id: body.audiobook },
            updatedAudiobook,
            function (err, party) {
              if (err) {
                res.status(400);
                res.send(err);
              }
              console.log("Creating order");
              res.json({ data: order });
            },
          );
        });

        // console.log("Creating order");
        // res.json({ data: order });
      }
    });
    // Orders.updateOne(
    //   { order_id: body.razorpayOrderId },
    //   { ...body, status: "Success" },
    // ).exec((err, data) => {
    //   if (err || !data) {
    //     res.status(400).send({ message: "No data found!" });
    //   } else {
    //     data.status = "Success";
    //     res.send(data);
    //   }
    // });
  } else {
    // Orders.updateOne(
    //   { order_id: body.razorpayOrderId },
    //   { status: "Failed" },
    // ).exec((err, data) => {
    //   if (err) {
    //     res.status(400).send({ message: "No data found!" });
    //   } else {
    //     data.status = "Failed";
    //     res.send(data);
    //   }
    // });
    res.status(400).send({ message: "Payment verification failed" });
  }
};

exports.inapp = async function (req, res) {
  const { body, user } = req;
  if (user) {
    body.user = user._id;
  }
  if (body.audiobook) {
    Orders.create(body, (err, order) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(order);
    });
  } else {
    res.status(400).send({ message: "Some fields are missing." });
  }
};
