const _ = require("lodash");
const jwt = require("jsonwebtoken");
var config = require("../config");
const User = require("../models/user");

async function validate(req, res, next) {
  let token = "";
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];
      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
        try {
          var decoded = jwt.verify(token, config.secret);
          if (decoded.type === "user") {
            var user = await User.findOne({ _id: decoded.data._id });
            decoded.data = user;
            // console.log(user)
            if (!user) {
              res.status(401);
              res.send({ message: "User not found!" });
            } else {
              req.user = user;
              await next();
            }
          } else if (decoded.type === "organization") {
            var org = await Organization.findOne(decoded.data._id);
            decoded.data = {};
            decoded.data.organization = org;
            await next();
          } else if (decoded.type === "root") {
            var user = await User.findOneByid(decoded.data._id);
            decoded.data = user;
            req.user = user;
            await next();
          }
        } catch (err) {
          if (err.name === "TokenExpiredError") {
            res.status(401);
            res.send({ message: "Access token Expired." });
          } else {
            res.status(401);
            res.send({ message: "Invalid access token." });
          }
        }
      }
    } else {
      res.status(401);
      res.send({
        message:
          "Invalid authorization header format. Format is Authorization: Bearer [token]",
      });
    }
  } else {
    res.status(401);
    res.send({ message: "No authorization header was found" });
  }
}

const getUserIftoken = async (req, res, next) => {
  let token = "";
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];
      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
        try {
          var decoded = jwt.verify(token, config.secret);
          if (decoded.type === "user") {
            var user = await User.findOne({ _id: decoded.data._id });
            decoded.data = user;
            // console.log(user)
            if (!user) {
              res.status(401);
              res.send({ message: "User not found!" });
            } else {
              req.user = user;
              await next();
            }
          } else if (decoded.type === "organization") {
            var org = await Organization.findOne(decoded.data._id);
            decoded.data = {};
            decoded.data.organization = org;
            await next();
          } else if (decoded.type === "root") {
            var user = await User.findOneByid(decoded.data._id);
            decoded.data = user;
            req.user = user;
            await next();
          }
        } catch (err) {
          req.user = undefined;
          await next();
        }
      }
    } else {
      req.user = undefined;
      await next();
    }
  } else {
    req.user = undefined;
    await next();
  }
};

module.exports = { validate, getUserIftoken };
