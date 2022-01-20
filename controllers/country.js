const Country = require("../models/country");
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
  const filters = await convertParams(Country, req.query);
  Country.find(filters.find)
    .where(filters.where)
    .sort({ name: "asc" })
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, country) {
      if (err) {
        return res.status(400).send(err);
      }
      Country.countDocuments(
        { ...filters.where, ...filters.find },
        (err, count) => {
          if (err) {
            res.status(400);
            res.send({ message: "Parameters are not valid" });
          }
          const countryList = {
            country,
            countryCount: country.length,
            total: count,
          };

          res.status(200).send(countryList);
        },
      );
    });
};

exports.findOne = function (req, res) {
  const { params } = req;
  Country.findOne({ _id: params.id })
    .exec(function (err, country) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      // console.log(country)
      if(country)
      res.send(country);
      else
      res.send({ message: "Document Not Found" });
    });
};

exports.create = (req, res) => {
  const { body, user } = req;
  if (user) {
    body.createdBy = user._id;
    body.updatedBy = user._id;
  }
  if (body.name && body.email ) {
    Country.create(body, (err, cart) => {
        if (err) {
          res.status(400);
          res.send(err);
        }
        res.send(cart);
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
    Country.updateOne({ _id: params.id }, body, function (err, country) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(country);
    })
  } else {
    res.status(400);
    res.send({ message: "ID not found!" });
  }
};

exports.delete = function (req, res) {
  const { params } = req;

  if (params.id) {
    Country.deleteOne({ _id: params.id }, function (err, country) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      res.send(country);
    });
  } else {
    res.status(400);
    res.send({ message: "ID not found!" });
  }
};
