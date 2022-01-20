const { Seeder } = require("mongo-seeding");
const config = require("../../config.json");

const path = require("path");
// const Country = require('../../models/country')
const newConfig = {
  database: config.db.url,
  dropCollections: true,
};
// console.log(newConfig)
const seeder = new Seeder(newConfig);
// console.log(`${__dirname}`)
const collections = seeder.readCollectionsFromPath(
  path.resolve(`${__dirname}/../data`),
);
// console.log(collections, "collec");
// console.log(seeder, "seeder");

seeder
  .import(collections)
  .then(() => {
    console.log("Success");
  })
  .catch((err) => {
    // console.log("Error", err);
  });
