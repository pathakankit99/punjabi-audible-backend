const UserActivity = require("../models/userActivity");
const _ = require("lodash");

function convertParams(model, params) {
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
      finalQuery.where[f] = { $regex: `^${params[f]}`, $options: "i" };
    } else {
      finalQuery.where[f] = params[f];
    }
  });
  _.map(query, (f) => {
    if (f === "type") {
      finalQuery.where[f] = params[f];
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
  const filters = await convertParams(UserActivity, req.query);
  //   console.log(filters, "FIL");
  UserActivity.find(filters.find)
    .where(filters.where)
    .populate("user")
    .populate("audiobooks", "audiobook_id")
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, activity) {
      if (err) {
        return res.status(400).send(err);
      }
      UserActivity.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Parameters are not valid" });
          }
          const activityList = {
            activity,
            activityCount: activity.length,
            total: count,
          };

          res.status(200).send(activityList);
        },
      );
    });
};

exports.findOne = function (req, res) {
  const { params } = req;
  UserActivity.findOne({ _id: params.id })
    .populate("user")
    .populate("createdBy")
    .exec(function (err, activity) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      //   console.log(activity);
      if (activity) res.send(activity);
      else res.send({ message: "Document Not Found" });
    });
};

exports.create = (req, res) => {
  const { body, user } = req;
  if (user) {
    body.user = user._id;
  }
  if (body) {
    UserActivity.create(body, (err, activity) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(activity);
    });
  } else {
    res.status(400).send({ message: "Some fields are missing." });
  }
};

exports.update = function (req, res) {
  const { body, user, params } = req;
  if (user) {
    body.updatedBy = user._id;
  }
  if (params.id) {
    UserActivity.updateOne({ _id: params.id }, body, function (err, activity) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(activity);
    });
  } else {
    res.status(400);
    res.send({ message: "ID not found!" });
  }
};

exports.delete = function (req, res) {
  const { params } = req;

  if (params.id) {
    UserActivity.deleteOne({ _id: params.id }, function (err, activity) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(activity);
    });
  } else {
    res.status(400);
    res.send({ message: "ID not found!" });
  }
};
