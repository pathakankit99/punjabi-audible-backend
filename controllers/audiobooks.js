const AudioBook = require("../models/audiobooks");
const Orders = require("../models/order");
const _ = require("lodash");
const uuidv1 = require("uuid/v1");
const config = require("../config.json");
const AWS = require("aws-sdk");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;

function convertParams(model, params) {
  const finalQuery = {};
  const keys = _.keys(model.schema.obj);
  const query = _.keys(_.pickBy(params, _.identity));
  const final = _.intersectionWith(query, keys);
  const options = ["_ne", "_lt", "_gt", "_lte", "_gte"];
  finalQuery.find = {};
  finalQuery.where = {};
  finalQuery.sort = { created_at: -1 };
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
        finalQuery.sort = {};
        finalQuery.sort[actualQuery[0]] = Number(actualQuery[1]);
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
      // console.log(model.schema.obj[f], "LOG");

      if (
        (model.schema.obj[f].valueType &&
          model.schema.obj[f].valueType === "ObjectId") ||
        (Array.isArray(model.schema.obj[f]) &&
          model.schema.obj[f][0].valueType &&
          model.schema.obj[f][0].valueType === "ObjectId")
      ) {
        // console.log(finalQuery.where[f] + " is " + params[f]);
        finalQuery.where[f] = ObjectId(params[f]);
      } else {
        finalQuery.where[f] = params[f];
      }
    }
  });
  // console.log(finalQuery, "5");
  _.map(query, (f) => {
    if (f === "language") {
      params[f] = params[f].slice(1);
      var newLanguages = params[f].replace(/,/g, "");
      var languages = newLanguages.split("|");
      finalQuery.where["language"] = {
        $in: languages,
      };
    }
  });
  // console.log(finalQuery, "6");
  if (params.keyword) {
    const $or = [
      { serviceUser: { $regex: `^${params.keyword}`, $options: "i" } },
      { form_id: { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
}

const upload = ({ base64, fileName }, folder) => {
  return new Promise((resolve, reject) => {
    const base64Data = new Buffer.from(
      base64.split(";")[1].replace(/^base64,/, ""),
      "base64",
    );
    const type = base64.split(";")[0].split("/")[1];
    const name = uuidv1() + fileName;
    const params = {
      Bucket: config.aws.bucketName,
      Key: `${folder || "audiobooks"}/` + name,
    };
    const s3 = new AWS.S3({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      params,
    });
    s3.upload({ ACL: "public-read", Body: base64Data }, (err, data) => {
      // Whether there is an error or not, delete the temp file
      if (err) {
        return reject(err);
      }
      return resolve({
        src: data.Location,
        name: fileName || undefined,
      });
    });
  });
};

const uploadSignatues = (signatures) => {
  return Promise.all(
    signatures.map(async (key) => {
      if (key.base64) {
        return {
          ...(await upload(key)),
          size: key.size,
          time: key.time,
          title: key.title,
          id: uuidv1(),
        };
      }
      return key;
    }),
  ).then((res) => res);
};

exports.list = async function (req, res) {
  const filters = await convertParams(AudioBook, req.query);
  const { body, user } = req;
  // console.log(user, "FIL");

  console.log(filters, "XX");
  if (req.user) {
    AudioBook.aggregate([
      {
        $match: { ...filters.where, ...filters.find },
      },
      {
        $lookup: {
          from: "orders", // collection to join
          localField: "_id", // field from the input documents
          foreignField: "audiobook", // field from the documents of the "from" collection
          as: "bought", // output array field
        },
      },
      {
        $lookup: {
          from: "wishlists", // collection to join
          localField: "_id", // field from the input documents
          foreignField: "audioBook", // field from the documents of the "from" collection
          as: "list", // output array field
        },
      },
      {
        $lookup: {
          from: "parties", // collection to join
          localField: "author", // field from the input documents
          foreignField: "_id", // field from the documents of the "from" collection
          as: "author", // output array field
        },
      },
      {
        $lookup: {
          from: "parties", // collection to join
          localField: "narratedBy", // field from the input documents
          foreignField: "_id", // field from the documents of the "from" collection
          as: "narratedBy", // output array field
        },
      },
      {
        $lookup: {
          from: "parties", // collection to join
          localField: "publishedBy", // field from the input documents
          foreignField: "_id", // field from the documents of the "from" collection
          as: "publishedBy", // output array field
        },
      },
      {
        $lookup: {
          from: "categories", // collection to join
          localField: "category", // field from the input documents
          foreignField: "_id", // field from the documents of the "from" collection
          as: "category", // output array field
        },
      },
      { $unwind: "$author" },
      { $unwind: "$narratedBy" },
      { $unwind: "$publishedBy" },
      {
        $project: {
          _id: "$_id",
          audio: "$audio",
          author: "$author",
          narratedBy: "$narratedBy",
          publishedBy: "$publishedBy",
          cover: "$cover",
          name: "$name",
          description: "$description",
          releaseDate: "$releaseDate",
          language: "$language",
          tags: "$tags",
          country: "$country",
          rating: "$rating",
          totalRatings: "$totalRatings",
          totalReviews: "$totalReviews",
          itemsSold: "$itemsSold",
          duration: "$duration",
          price: "$price",
          category: "$category",
          updated_at: "$updated_at",
          created_at:"$created_at",
          is_user_bought: { $in: [ObjectId(user._id), "$bought.user"] },
          is_wishlisted: { $in: [ObjectId(user._id), "$list.user"] },
          is_audiobook_present_in_order: {
            $in: ["$_id", "$bought.audiobook"],
          },
        },
      },
      { $sort: filters.sort },
      { $skip: filters.start },
      { $limit: filters.limit },
    ])
      .then((data) => {
        // console.log(data, "DATA");
        console.log({ ...filters.where, ...filters.find });
        AudioBook.countDocuments(
          { ...filters.where, ...filters.find },
          (err, count) => {
            if (err) {
              res.status(400);
              res.send(err);
            }
            res.status(200).send({
              audiobooks: data,
              total: count,
              audiobook_total: data.length,
            });
          },
        );
      })
      .catch((error) => {
        res.status(400).send(error);
      });
  } else {
    AudioBook.find(filters.find)
      .where(filters.where)
      .populate("updatedBy")
      .populate("createdBy")
      .populate("category")
      .populate("author")
      .populate("publishedBy")
      .populate("narratedBy")
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .exec(function (err, audiobooks) {
        if (err) {
          return res.status(400).send(err);
        }
        AudioBook.countDocuments(
          { ...filters.where, ...filters.find },
          (err, count) => {
            if (err) {
              res.status(400);
              res.send({ message: "Parameters are not valid" });
            }
            const audioBooksList = {
              audiobooks,
              audioBooksCount: audiobooks.length,
              total: count,
            };

            res.status(200).send(audioBooksList);
          },
        );
      });
  }
};

exports.findOne = function (req, res) {
  const { params } = req;
  AudioBook.findOne({ _id: params.id })
    .populate("updatedBy")
    .populate("createdBy")
    .populate("category")
    .populate("author")
    .populate("publishedBy")
    .populate("narratedBy")
    .exec(function (err, audiobooks) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(audiobooks);
    });
};

exports.create = (req, res) => {
  const { body, user } = req;
  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }
  // console.log(body);
  if (body.cover) {
    upload(body.cover, "bookcover")
      .then((bookCover) => {
        body.cover = bookCover.src;
        if (body.audio) {
          uploadSignatues(body.audio)
            .then((resp) => {
              body.audio = resp;
              AudioBook.create(body, function (err, audiobooks) {
                if (err) {
                  res.status(400);
                  res.send(err);
                }
                res.send(audiobooks);
              });
            })
            .catch(() =>
              res
                .status(400)
                .send({ message: "Failed to upload audio files." }),
            );
        } else {
          res.status(400).send({ message: "Audio files are missing." });
        }
      })
      .catch(() =>
        res.status(400).send({ message: "Failed to upload cover image." }),
      );
  } else {
    res.status(400).send({ message: "Audio book cover image is missing." });
  }
};

const updateAudios = (body, params, res) => {
  if (body.audio) {
    uploadSignatues(body.audio)
      .then((resp) => {
        body.audio = resp;
        // console.log(body, "BODY");
        AudioBook.updateOne(
          { _id: params.id },
          body,
          function (err, audiobooks) {
            // console.log(res,"RESS")
            if (err) {
              res.status(400);
              res.send(err);
            }
            res.send(audiobooks);
          },
        );
      })
      .catch(() =>
        res.status(400).send({ message: "Failed to upload audio files." }),
      );
  } else {
    res.status(400).send({ message: "Audio files are missing." });
  }
};

exports.update = function (req, res) {
  const { body, user, params } = req;
  if (user) {
    body.updatedBy = user._id;
  }
  if (params.id) {
    if (body.cover) {
      if (typeof body.cover === "string" && body.cover.startsWith("https")) {
        body.cover = body.cover;
        updateAudios(body, params, res);
      } else {
        upload(body.cover).then((cover) => {
          body.cover = cover.src;
          updateAudios(body, params, res);
        });
      }
    }
  } else {
    res.status(400);
    res.send({ message: "AudioBook id not found!" });
  }
};

exports.delete = function (req, res) {
  const { params } = req;

  if (params.id) {
    AudioBook.deleteOne({ _id: params.id }, function (err, audiobooks) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(audiobooks);
    });
  } else {
    res.status(400);
    res.send({ message: "Audio book id not found!" });
  }
};
