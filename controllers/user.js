/* eslint-disable no-underscore-dangle */
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const formidable = require("formidable");
const config = require("../config.json");
const accountSid = config.twilio.twilioAccountSid;
const authToken = config.twilio.twilioAuthToken;
const client = require("twilio")(accountSid, authToken);
const User = require("../models/user");
const sendMessage = require("../services/send-message");
const Role = require("../models/role");
const uploadFiles = require("../services/upload-files");
const Post = require("../models/post");
const DeviceToken = require("../models/devicetokens");
const bcrypt = require("bcryptjs");

const CLIENT_ID =
  "513136185738-44dfaqe7lraoufs65c3ae4vgori7mo8a.apps.googleusercontent.com";

const { OAuth2Client } = require("google-auth-library");
const googleclient = new OAuth2Client(CLIENT_ID);

function generatePassword(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

exports.googleAuth = (req, res) => {
  const { token } = req.body;
  if (token) {
    console.log(token, "TOKEN");
    async function verify() {
      const ticket = await googleclient.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,
      });

      console.log(ticket, "TICKET");
      const payload = ticket.getPayload();
      const userid = payload["sub"];
      console.log(payload, userid, "XXXX");
      res.send({ token });
    }
    verify().catch(console.error);
  }
};

exports.test = (req, res) => {
  client.messages
    .create({
      body: "This is the ship that made the Kessel Run in fourteen parsecs?",
      from: "+19283623557",
      to: "+918288841089",
    })
    .then((message) => res.send({ msg: message.sid }))
    .catch((err) => res.status(500).send({ msg: err }));
};

exports.list = async function (req, res) {
  const { query } = req;
  const filters = convertParams(User, query);
  User.find(filters.find)
    .where(filters.where)
    .sort({ created_at: "desc" })
    .populate("role")
    .skip(filters.start)
    .limit(filters.limit)
    .exec(function (err, users) {
      if (err) {
        res.status(400);
        res.send(err);
      }
      User.countDocuments(
        { ...filters.where, ...filters.find },
        function (err, count) {
          if (err) {
            res.status(400);
            res.send(err);
          }
          var usersList = {
            users: users,
            usersCount: users.length,
            total: count,
          };
          res.status(200);
          res.send(usersList);
        },
      );
    });
};

exports.findOne = (req, res) => {
  const { id } = req.params;
  User.findOne({ _id: id })
    .populate("role")
    .exec((err, user) => {
      if (err) {
        res.status(400);
        res.send(err);
      }
      if (user) {
        Post.countDocuments(
          { user: id, type: "image" },
          (error, imageCount) => {
            Post.countDocuments(
              { user: id, type: "video" },
              (errors, videoCount) => {
                res.status(200).send({
                  ...user._doc,
                  imageCount,
                  videoCount,
                  totalPosts: Number(imageCount) + Number(videoCount),
                });
              },
            );
          },
        );
      } else {
        res.status(400);
        res.send("no user found");
      }
    });
};

exports.currentUser = (req, res) => {
  if (req.user) {
    User.findById({ _id: req.user._id })
      .populate("role")
      .exec((err, data) => {
        if (!err) {
          delete data.password;
          res.status(200).send(data);
        } else {
          res.status(404).send({ message: "User not found" });
        }
      });
  } else {
    res.status(400).send({ message: "Token is not valid" });
  }
};

exports.create = (req, res) => {
  const { body } = req;
  if (body.role) {
    createOrFindRole(body.role).then((role) => {
      if (role && role._id) {
        body.role = role._id;
        User.findOne({ email: body.email }, (err, user) => {
          if (err) {
            return res.status(400).send(err);
          }
          if (user) {
            return res
              .status(400)
              .send({ message: "Account already exits with this email." });
          } else {
            User.create(body, async (err, user) => {
              if (err) {
                return res.status(400).send(err);
              }
              if (user) {
                res.status(200);
                res.send(user);
              }
            });
          }
        });
      }
    });
  } else {
    res.status(400).send({ message: "User role is missing" });
  }
};

exports.update = function (req, res) {
  const { body } = req;
  User.updateOne({ _id: body._id }, body, (err, user) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    User.findOne({ _id: body._id })
      .populate("role")
      .exec((err, data) => {
        if (err) {
          res.status(400);
          res.send(err);
        }
        if (data) {
          delete data.password;
          res.status(200);
          res.send(data);
        } else {
          res.status(400);
          res.send("User not found !");
        }
      });
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  User.deleteOne({ _id: id }, (err, user) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.status(200);
    res.send(user);
  });
};

exports.deleteMany = (req, res) => {
  const { ids } = req.params;
  User.deleteMany({ _id: ids.split(",") }, (err, users) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    res.status(200);
    res.send(users);
  });
};

exports.login = (req, res, next) => {
  const q = {
    $or: [
      {
        email: req.body.identifier,
      },
      {
        phone: req.body.identifier,
      },
    ],
  };

  User.findOne(q)
    .populate("role")
    .exec((err, user) => {
      if (err) return next(err);
      if (user) {
        if (user.isActive) {
          user.comparePassword(req.body.password, (err, isMatch) => {
            if (isMatch) {
              if (req.body.device_token) {
                checkOrCreateDeviceToken(req.body.device_token, user._id)
                  .then((data) => console.log(data, "DATA"))
                  .catch(() =>
                    res
                      .status(400)
                      .send({ msg: "Unable to create device token" }),
                  );
              }
              const token = jwt.sign(
                {
                  type: user.role.type === "root" ? "root" : "user",
                  access: ["read", "write"],
                  data: user,
                },
                config.secret,
                {
                  expiresIn: 86400,
                },
              );
              delete user.password;
              const userDetails = {
                message: "Login successful !",
                token_type: "Bearer",
                token,
                data: user,
              };
              res.status(200);
              res.send(userDetails);
            } else {
              res.status(400);
              res.json({ message: "Incorrect email or password." });
            }
          });
        } else {
          res.status(400);
          res.json({ message: "Your account is disabled!" });
        }
      } else {
        res.status(400);
        res.json({ message: "Incorrect email or password." });
      }
    });
};

exports.forgotpassword = (req, res) => {
  var body = req.body;
  User.findOne({ email:body.identifier }, (err, user) => {
    if (err) {
      res.send(err);
    }
    if (user) {
      const token = jwt.sign(
        {
          type: user.role.type === "root" ? "root" : "user",
          access: ["read", "write"],
          data: user,
        },
        config.secret,
        {
          expiresIn: 86400,
        },
      );
      const link =
      "http://localhost:3000/user/resetpassword?token=" + token;
      console.log(link)
      res.status(200);
              res.send(user);
      const subject = `Hi, ${user.name}, Reset your password.`;
    //   if (user && link) {
    //     toNewUser(
    //       "../templates/forgotPassword.ejs",
    //       user,
    //       link,
    //       subject,
    //       function (err, invitation) {
    //         if (err) {
    //           res.status(400);
    //           res.send(err);
    //         }
    //         res.status(200);
    //         res.send(user);
    //       }
    //     );
    //   } else {
    //     res.status(400).send({ message: "User not found!" });
    //   }
    } else {
      return res.status(400).send({ message: "User not found!" });
    }

    //   User.update(
    //     { _id: user._id },
    //     { password: newPassword },
    //     (err, updatedUser) => {
    //       if (err) {
    //         res.send(err);
    //       }
    //       const defaultMails = ["devops@abc.com"];
    //       defaultMails.push(req.body.email);
    //     },
    //   );
    // } else {
    //   res.status(400);
    //   res.send("Invalid email");
    // }
  });
};

/**
 * OTP verification.
 * @param {*} req
 * @param {*} res
 */
exports.verification = (req, res) => {
  const { params, body } = req;
  User.findOne({ _id: params.id }, (err, user) => {
    if (err) {
      return res.status(400).send(err);
    }
    const { otpInfo } = user;

    if (body.otp !== otpInfo.otp) {
      return res.status(400).json({ message: "Your OTP is not correct" });
    }

    const expiryDate = otpInfo.expiresIn;
    const nowDate = new Date();
    if (nowDate > expiryDate) {
      return res.status(400).json({ message: "Your OTP has exipred" });
    }

    // mark user as verified if otp is correct.
    User.updateOne({ _id: params.id }, { isVerified: true }, (userErr) => {
      if (userErr) {
        res.status(400).send(userErr);
      }
      return res.status(200).send(user);
    });
  });
};

const createOrFindRole = (role) =>
  new Promise((resolve, reject) => {
    Role.findOne({ name: role }, (err, res) => {
      if (err || !res) {
        return Role.create({ name: role }, (error, val) => {
          if (!error || val) {
            console.log(val, "VA:");
            return resolve(val);
          } else {
            return reject(error);
          }
        });
      }
      return resolve(res);
    });
  });

// Resend OTP.
exports.resendOtp = async (req, res) => {
  const { params } = req;
  User.findOne({ _id: params.id }, async (err, user) => {
    if (err) {
      return res.status(400).send(err);
    }

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const otp = sendMessage.generateOTP();
    const date = new Date();
    const expiryDate = new Date();
    expiryDate.setTime(date.getTime() + 5 * 1000 * 60);
    client.messages
      .create({
        body: `Hi, OTP for your account is ${otp}. Please enter the OTP to proceed. Thank you, Team WatchSocials`,
        from: "+19283623557",
        to: user.phone,
      })
      .then(() => {
        User.updateOne(
          { _id: user._id },
          { otpInfo: { otp, expiresIn: expiryDate } },
          (userErr, data) => {
            if (userErr) {
              return res.status(400).send(userErr);
            }
            return res.status(200).send(data);
          },
        );
      })
      .catch(() => res.status(500).send({ msg: "Failed to send OTP" }));
  });
};

/**
 * Create a refresh token.
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.createRefreshToken = (req, res) => {
  const { id } = req.params;
  if (id) {
    User.findOne({ _id: id })
      .populate("role")
      .exec((err, user) => {
        if (err) {
          res.status(400);
          res.send(err);
        }
        if (user) {
          const token = jwt.sign(
            {
              type: user.role.type === "root" ? "root" : "user",
              access: ["read", "write"],
              data: user,
            },
            config.secret,
            {
              expiresIn: 86400,
            },
          );
          delete user.password;
          const userDetails = {
            message: "Token refreshed",
            token_type: "Bearer",
            token,
            data: user,
          };
          res.status(200);
          res.send(userDetails);
        } else {
          res.status(401);
          res.send("User not found");
        }
      });
  } else {
    res.status(400);
    res.send("Please provide user id");
  }
};

exports.updatePassword = (req, res) => {
  const { body, user } = req;
  if (user && body) {
    User.findOne({ _id: user._id }).exec((err, data) => {
      data.comparePassword(body.currentPassword, (err, isMatch) => {
        if (isMatch) {
          User.update({ _id: data._id }, { password: body.newPassword }).exec(
            (err, response) => {
              if (!err) {
                res.status(200).send({
                  message: "Password updated successfully!",
                  user: data,
                });
              } else {
                res
                  .status(400)
                  .send({ message: "Unable to update the password" });
              }
            },
          );
        } else {
          res.status(400).send({ message: "Current password do not match" });
        }
      });
    });
  } else {
    res.status(400).send({ message: "Unable to update the password" });
  }
};

exports.uploadProfileImage = (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    if (files.file) {
      const location = files.file.path;
      const originalFileName = files.file.name;
      // uploads file.
      uploadFiles.upload(
        location,
        originalFileName,
        `users/${req.user._id}/profilePhoto`,
        (error, loc) => {
          if (error) {
            res.status(400);
            res.send(err);
          }
          // update profile url after uploading the image.
          User.updateOne(
            { _id: req.user._id },
            { profile_url: loc },
            (userError) => {
              if (userError) {
                res.status(400).send(err);
              }
              return res.status(200).send({ url: loc });
            },
          );
        },
      );
    } else {
      res.status(400).send({ message: "Please attach the file." });
    }
  });
};

exports.resetPassword = async (req, res) => {
  var password = req.body.password;
  var token = req.body.token.token;
  try {
    var decoded = jwt.verify(token, config.secret);
    if (decoded.type === "user") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      // console.log(`hashedPassword`, hashedPassword)
    
    User.updateOne(
        { _id: decoded.data._id },
        { password:hashedPassword, isActive: true, isVerified: true }
      ).exec((err, data)=>{
        if(err){
          res.status(400).send(err)
        }
        res.status(200);
        res.json(data);
      })

      // console.log(user,"USER")
      
    }
  } catch (err) {
    console.log(err, "ERR");
    if (err.name === "TokenExpiredError") {
      res.status(400);
      res.send("Link Expired.");
    } else {
      res.status(400);
      res.send("Invalid link");
    }
  }

}

const checkOrCreateDeviceToken = (token, user) =>
  new Promise((resolve, reject) =>
    DeviceToken.findOne({ user }, (err, device) => {
      if (err) {
        reject(err);
      }
      if (device) {
        DeviceToken.updateOne(
          { _id: device._id },
          { token, user },
          (error, response) => {
            if (error) {
              reject(error);
            }
            if (response) {
              resolve(device);
            }
          },
        );
      } else {
        DeviceToken.create({ token, user }, (error, newdevice) => {
          if (error) {
            reject(error);
          }
          if (newdevice) {
            resolve(newdevice);
          }
        });
      }
    }),
  );

const convertParams = (model, params) => {
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
      { name: { $regex: `^${params.keyword}`, $options: "i" } },
      { email: { $regex: `^${params.keyword}`, $options: "i" } },
      { phone: { $regex: `^${params.keyword}`, $options: "i" } },
    ];
    finalQuery.find["$or"] = $or;
  }
  return finalQuery;
};
