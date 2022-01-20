const { ObjectId } = require("mongoose").Types;

const PlaybackActivity = require("../models/playbackActivity");
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

    if (f === "audioBook") {
      finalQuery.where[f] = ObjectId(params[f]);
    }
    if (f === "startTime") {
      finalQuery.where[f] = new Date(params[f]);
    }
    if (f === "updated_at") {
      finalQuery.where[f] = new Date(params[f]);
    }
    if (f === "episode") {
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
  const filters = await convertParams(PlaybackActivity, req.query);
  console.log(filters, "FIL");
  PlaybackActivity.find(filters.find)
    .where(filters.where)
    .populate("user")
    .populate("audioBook")
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, activity) {
      if (err) {
        return res.status(400).send(err);
      }
      PlaybackActivity.countDocuments(
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

exports.listenLevel = function (req, res) {
  const { _id } = req.user;
  PlaybackActivity.aggregate([
    {
      $group: {
        _id: _id,
        totalPlaybackTime: { $sum: "$playbackTime" },
      },
    },
  ]).exec(function (err, data) {
    if (err) {
      res.status(400).send(err);
      return;
    }

    if (data) res.status(200).send(data);
    else res.send({ message: "No records found" });
  });
};

exports.findOne = function (req, res) {
  const { params } = req;
  PlaybackActivity.findOne({ _id: params.id })
    .populate("user")
    .exec(function (err, activity) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      //   console.log(activity);
      if (activity) res.status(200).send(activity);
      else res.send({ message: "Document Not Found" });
    });
};

exports.create = (req, res) => {
  const { body, user } = req;
  if (user) {
    body.user = user._id;
  }
  if (body) {
    PlaybackActivity.create(body, (err, activity) => {
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
    body.user = user._id;
  }
  if (params.id) {
    PlaybackActivity.updateOne({ _id: params.id }, body, function (err, activity) {
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

exports.stats = function (req, res) {
  const { user } = req;
  const { duration, key } = req.query;
  const userId = user._id;
  if (duration == "today") {
    const date = new Date();
    const temp = date.toISOString().split("T")[0];
    const today = new Date(temp);
    const tommorow = new Date(today);
    tommorow.setDate(tommorow.getDate() + 1);
    console.log(today, "  ", tommorow, "date");
    PlaybackActivity.aggregate([
      {
        $match: {
          user: ObjectId(userId),
          startTime: {
            $gte: today,
            $lt: tommorow,
          },
        },
      },
      {
        $group: {
          _id: userId,
          totalPlaybackTime: { $sum: "$playbackTime" },
        },
      },
    ]).exec(function (err, data) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      console.log(data);
      if (data) res.status(200).send(data);
      else res.send({ message: "No records found" });
    });
  } else if (duration == "daily") {
    const date = new Date();
    const temp = date.toISOString().split("T")[0];
    const startDate = new Date(temp);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() - 5);
    console.log(startDate, "  ", endDate, "date");
    PlaybackActivity.aggregate([
      {
        $match: {
          user: ObjectId(userId),
          startTime: {
            $lte: startDate,
            $gt: endDate,
          },
        },
      },
      { $sort: { startTime: -1 } },

      {
        $group: {
          _id: {
            year: { $year: "$startTime" },
            month: { $month: "$startTime" },
            day: { $dayOfMonth: "$startTime" },
          },
          totalPlaybackTime: { $sum: "$playbackTime" },
        },
      },
    ]).exec(function (err, data) {
      if (err) {
        res.status(400);

        res.send({ message: "No records found", err });
      }
      console.log(data);
      if (data) res.status(200).send(data);
    });
  } else if (duration == "monthly") {
    const date = new Date();
    const temp = date.toISOString().split("T")[0];
    const startDate = new Date(temp);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() - 5);
    console.log(startDate, "  ", endDate, "date");
    PlaybackActivity.aggregate([
      {
        $match: {
          user: ObjectId(userId),
          startTime: {
            $lte: startDate,
            $gt: endDate,
          },
        },
      },
      { $sort: { startTime: -1 } },
      {
        $group: {
          _id: {
            year: { $year: "$startTime" },
            month: { $month: "$startTime" },
          },
          totalPlaybackTime: { $sum: "$playbackTime" },
        },
      },
    ]).exec(function (err, data) {
      if (err) {
        res.status(400);
        // res.send(err);
        res.send({ message: "No records found", err });
      }
      console.log(data);
      if (data) res.status(200).send(data);
      // else res.send({ message: "No records found" });
    });
  } else if (duration == "total") {
    PlaybackActivity.aggregate([
      {
        $match: {
          user: ObjectId(userId),
        },
      },
      {
        $group: {
          _id: userId,
          totalPlaybackTime: { $sum: "$playbackTime" },
        },
      },
    ]).exec(function (err, data) {
      if (err) {
        res.status(400);
        // res.send(err);
        res.send({ message: "No records found", err });
      }
      console.log(data);
      if (data) res.status(200).send(data);
      // else res.send({ message: "No records found" });
    });
  } else if (key == "recentlyPlayed") {
    PlaybackActivity.aggregate([
      {
        $match: {
          user: ObjectId(userId),
        },
      },
      { $sort: { updated_at: -1 } },
      {
        $group: {
          _id: "$audioBook",
          audioBookId: { $first: "$audioBook" },
          updated_at: { $first: "$updated_at" },
        },
      },
      { $sort: { updated_at: -1 } },
      {
        $lookup: {
          from: "audiobooks",
          localField: "audioBookId",
          foreignField: "_id",
          as: "audioBookDetail",
        },
      },
      { $unwind: { path: "$audioBookDetail" } },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.author",
          foreignField: "_id",
          as: "audioBookDetail.author",
        },
      },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.narratedBy",
          foreignField: "_id",
          as: "audioBookDetail.narratedBy",
        },
      },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.publishedBy",
          foreignField: "_id",
          as: "audioBookDetail.publishedBy",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "audioBookDetail.category",
          foreignField: "_id",
          as: "audioBookDetail.category",
        },
      },

      { $unwind: { path: "$audioBookDetail.author" } },
      { $unwind: { path: "$audioBookDetail.narratedBy" } },
      { $unwind: { path: "$audioBookDetail.publishedBy" } },
    ]).exec(function (err, data) {
      if (err) {
        res.status(400);
        // res.send(err);
        res.send({ message: "No records found", err });
      }
      console.log(data);
      if (data) res.status(200).send(data);
      // else res.send({ message: "No records found" });
    });
  } else if (key == "finished") {
    PlaybackActivity.aggregate([
      {
        $match: {
          user: ObjectId(userId),
        },
      },
      { $sort: { updated_at: -1 } },
      {
        $group: {
          _id: { audiobook: "$audioBook", episode:"$episode" },
          audioBookId: { $first: "$audioBook" },
          updated_at: { $first: "$updated_at" },
          finished: { $first: "$finished" },
          episode: { $first: "$episode" },
        },
      },
      { $sort: { updated_at: -1 } },
      {
        $match: {
          finished: true,
        },
      },
      {
        $lookup: {
          from: "audiobooks",
          localField: "audioBookId",
          foreignField: "_id",
          as: "audioBookDetail",
        },
      },
      { $unwind: { path: "$audioBookDetail" } },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.author",
          foreignField: "_id",
          as: "audioBookDetail.author",
        },
      },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.narratedBy",
          foreignField: "_id",
          as: "audioBookDetail.narratedBy",
        },
      },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.publishedBy",
          foreignField: "_id",
          as: "audioBookDetail.publishedBy",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "audioBookDetail.category",
          foreignField: "_id",
          as: "audioBookDetail.category",
        },
      },
      { $unwind: { path: "$audioBookDetail.author" } },
      { $unwind: { path: "$audioBookDetail.narratedBy" } },
      { $unwind: { path: "$audioBookDetail.publishedBy" } },
    ]).exec(function (err, data) {
      if (err) {
        res.status(400);
        // res.send(err);
        res.send({ message: "No records found", err });
      }
      console.log(data);
      if (data) res.status(200).send(data);
      // else res.send({ message: "No records found" });
    });
  } else if (key == "unfinished") {
    PlaybackActivity.aggregate([
      {
        $match: {
          user: ObjectId(userId),
        },
      },
      { $sort: { updated_at: -1 } },
      {
        $group: {
          _id: { audiobook: "$audioBook", episode: "$episode" },
          audioBookId: { $first: "$audioBook" },
          updated_at: { $first: "$updated_at" },
          finished: { $first: "$finished" },
          episode: { $first: "$episode" },
        },
      },
      { $sort: { updated_at: -1 } },
      {
        $match: {
          finished: false,
        },
      },
      {
        $lookup: {
          from: "audiobooks",
          localField: "audioBookId",
          foreignField: "_id",
          as: "audioBookDetail",
        },
      },
      { $unwind: { path: "$audioBookDetail" } },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.author",
          foreignField: "_id",
          as: "audioBookDetail.author",
        },
      },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.narratedBy",
          foreignField: "_id",
          as: "audioBookDetail.narratedBy",
        },
      },
      {
        $lookup: {
          from: "parties",
          localField: "audioBookDetail.publishedBy",
          foreignField: "_id",
          as: "audioBookDetail.publishedBy",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "audioBookDetail.category",
          foreignField: "_id",
          as: "audioBookDetail.category",
        },
      },

      { $unwind: { path: "$audioBookDetail.author" } },
      { $unwind: { path: "$audioBookDetail.narratedBy" } },
      { $unwind: { path: "$audioBookDetail.publishedBy" } },
    ]).exec(function (err, data) {
      if (err) {
        res.status(400);
        // res.send(err);
        res.send({ message: "No records found", err });
      }
      console.log(data);
      if (data) res.status(200).send(data);
      // else res.send({ message: "No records found" });
    });
  }
};
