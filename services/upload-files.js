const fs = require("fs");
const AWS = require("aws-sdk");
const config = require("../config");
const ffmpeg = require("fluent-ffmpeg");
const uuidv1 = require("uuid/v1");

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");
ffmpeg.setFlvtoolPath("/usr/bin");

//upload file.
exports.upload = (path, originalFileName, modelName, callback) => {
  // const originalFileName = files.file.name;
  fs.readFile(path, function (err, data) {
    if (err) throw err; // Something went wrong!
    const name = originalFileName.split(".");
    const ext = name[name.length - 1];
    name.pop();
    const tempfileName = name.toString();
    const fileName = tempfileName.replace(/,/g, "");

    const s3 = new AWS.S3({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      params: {
        Bucket: config.aws.bucketName,
        Key: modelName + "/" + fileName + "-" + uuidv1() + "." + ext,
      },
    });
    s3.upload({ ACL: "public-read", Body: data }, function (err, data) {
      // Whether there is an error or not, delete the temp file
      fs.unlink(path, function (err) {
        if (err) {
          console.error(err);
        }
      });
      if (err) {
        return callback(err, null);
      }
      return callback(null, data.Location);
    });
  });
};

//compress video and return location.
exports.compressVideo = (files, cb) => {
  return new Promise((resolve, reject) => {
    const file = files.file;
    ffmpeg(file.path)
      .videoCodec("libx264")
      .size("640x480")
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        return reject(err.message);
      })
      .on("progress", function (progress) {
        console.log("... frames: " + progress.frames);
      })
      .on("end", function (v) {
        return resolve(`uploads/${file.name}`);
      })
      .save(`uploads/${file.name}`);
  });
};

//Deletes file from the bucket.
exports.deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    var bucketInstance = new AWS.S3();
    var params = {
      Bucket: config.aws.bucketName,
      Key: filePath,
    };
    bucketInstance.deleteObject(params, function (err, data) {
      if (data) {
        console.log("File deleted successfully");
        resolve();
      } else {
        console.log("Check if you have sufficient permissions : " + err);
        reject();
      }
    });
  });
};
