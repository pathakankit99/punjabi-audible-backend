const AudiobookReview = require("../models/audiobookReview");
const AudioBook = require("../models/audiobooks");
const _ = require("lodash");
const mongoose = require("mongoose");

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
  _.map(query, (f) => {
    if (f === "audiobook") {
      finalQuery.where[f] = mongoose.Types.ObjectId(params[f]);
    }
  });
  _.map(query, (f) => {
    if (f === "user") {
      finalQuery.where[f] = mongoose.Types.ObjectId(params[f]);
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
  const filters = await convertParams(AudiobookReview, req.query);
  // console.log(filters, "FINAL");
  AudiobookReview.find(filters.find)
    .where(filters.where)
    .populate("user")
    .populate("audiobook")
    .sort({ created_at: "desc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, audiobookReview) {
      if (err) {
        return res.status(400).send(err);
      }
      AudiobookReview.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Parameters are not valid" });
          }
          const audiobookReviewList = {
            audiobookReview,
            audiobookReviewCount: audiobookReview.length,
            total: count,
          };

          res.status(200).send(audiobookReviewList);
        },
      );
    });
};

exports.findOne = function (req, res) {
  const { params } = req;
  // console.log(params.id)
  AudiobookReview.findOne({ _id: params.id })
    .populate("user")
    .populate("audiobook")
    .exec(function (err, audiobookReview) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      // console.log("Review found "+audiobookReview)
      res.send(audiobookReview);
    });
};

exports.create = (req, res) => {
  const { body, user } = req;
  if (user) {
    body.user = user._id;
  }
  AudioBook.findOne({ _id: body.audiobook }).exec(function (err, audiobook) {
    if (err) {
      res.status(400);
      res.send(err);
    }
    // console.log("Audiobook found...")
    if (audiobook) {
      AudiobookReview.create(body, (err, review) => {
        if (err) {
          res.status(400);
          res.send(err);
        }

        audiobook.totalReviews = audiobook.totalReviews + 1;
        audiobook.totalRatings = audiobook.totalRatings + body.rating;
        audiobook.rating = audiobook.totalRatings / audiobook.totalReviews;
        AudioBook.updateOne(
          { _id: audiobook.id },
          audiobook,
          function (err, updatedAudiobook) {
            if (err) {
              res.status(400);
              res.send(err);
            }
            // console.log("Updated Audiobook")

            res.send(review);
          },
        );
      });
    } else res.send({ message: "Audiobook Not Found. Please provide a valid Audiobook ID." });
  });
};

exports.update = function (req, res) {
  const { body, params } = req;
  if (params.id) {
    AudioBook.findOne({ _id: body.audiobook }) //Checks if Audiobook exists
      .exec(function (err, audiobook) {
        if (err) {
          res.status(400);
          res.send(err);
        }
        // console.log("Audiobook found...")
        AudiobookReview.findOne({ _id: params.id }) //Checks if audiobook review exists: to store old rating
          .exec(function (err, audiobookReview) {
            if (err) {
              res.status(400);
              res.send(err);
            }

            var oldRating = audiobookReview.rating;
            // console.log("Audiobook Review found...")
            // console.log(body.audiobook+"   "+audiobookReview.audiobook)
            if (body.audiobook == audiobookReview.audiobook) {
              //checks if the review is for same audiobook
              AudiobookReview.updateOne(
                { _id: params.id },
                body,
                function (err, updatedAudiobookReview) {
                  //Updates audiobook review
                  if (err) {
                    res.status(400);
                    res.send(err);
                  }
                  // console.log("Audiobook Review Updated...")

                  audiobook.totalRatings =
                    audiobook.totalRatings - oldRating + body.rating;
                  // console.log(audiobook.totalRatings+" "+oldRating)
                  audiobook.rating =
                    audiobook.totalRatings / audiobook.totalReviews;
                  AudioBook.updateOne(
                    { _id: audiobook.id },
                    audiobook,
                    function (err, updatedAudiobook) {
                      //updates audiobook data
                      if (err) {
                        res.status(400);
                        res.send(err);
                      }
                      // console.log("Updated Audiobook")

                      res.send(updatedAudiobookReview);
                    },
                  );
                },
              );
            }
          });
      });
  } else {
    res.status(400);
    res.send({ message: "Audiobook ID not found!" });
    // AudioBook.updateOne({ _id: body.audiobook }, audiobook, function (err, updatedAudiobook) {
  }
};

exports.delete = function (req, res) {
  const { params } = req;

  if (params.id) {
    res.send({ message: "Not Allowed" });
    // AudiobookReview.findOne({ _id: params.id })  //Finds the review to store the rating
    //   .exec(function (err, audiobookReview) {
    //     if (err) {
    //       res.status(400);
    //       res.send(err);
    //     }
    //     var oldRating = audiobookReview.rating;
    //     var audiobook_id = audiobookReview.audiobook;
    //     // console.log("Review found "+audiobookReview)

    //     AudioBook.findOne({ _id: audiobook_id })  //finds the audiobook
    //     .exec(function (err, audiobook) {
    //       if (err) {
    //         res.status(400);
    //         res.send(err);
    //       }
    //       // console.log(audiobook)
    //       audiobook.totalReviews = audiobook.totalReviews-1;
    //       audiobook.totalRatings = audiobook.totalRatings-oldRating;
    //       audiobook.rating = (audiobook.totalRatings)/audiobook.totalReviews;

    //       AudioBook.updateOne({ _id: audiobook_id }, audiobook, function (err, updatedAudiobook) { //updates the audiobook new rating
    //         if (err) {
    //           res.status(400);
    //           res.send(err);
    //         }
    //         // console.log("Updated Audiobook")
    //       })

    //       AudiobookReview.deleteOne({ _id: params.id }, function (err, audiobookReview) { //deletes the older review
    //         if (err) {
    //           res.status(400);
    //           res.send(err);
    //         }

    //         res.send(audiobookReview);
    //       });
    //       // console.log("Review found "+audiobookReview)
    //     });

    //   });
  } else {
    res.status(400);
    res.send({ message: "ID not found!" });
  }
};
