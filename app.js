const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const passport = require("passport");
const mongoose = require("mongoose");

const app = express();
const port = 8080;
const server = app.listen(port);
const io = require("socket.io")(server);
const user = require("./routes/user");
const role = require("./routes/role");
const forms = require("./routes/forms");
const post = require("./routes/post");
const activity = require("./routes/activity");
const category = require("./routes/category");
const audiobooks = require("./routes/audiobooks");
const wishlist = require("./routes/wishlist");
const party = require("./routes/party");
const country = require("./routes/country");
const audiobookReview = require("./routes/audiobookReview");
const userActivity = require("./routes/userActivity");
const order = require("./routes/order");
const playbackActivity = require("./routes/playbackActivity");
const contact = require("./routes/contact");

const importCountry = require("./seeder/country");

app.use(cors());
const config = require("./config.json");

// Set up mongoose connection
mongoose.Promise = global.Promise;
const dBUrl = config.db.localurl;
mongoose.connect(
  dBUrl,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  },
  (err) => {
    if (err) {
      console.log("DB Not Connected");
    } else {
      // importCountry.importCountry
      console.log("DB Connected");
    }
  },
);

app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(bodyParser.json({ limit: "8000mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "8000mb", extended: true }));
console.log("8000mb limit")
app.use("/user", user);
app.use("/role", role);
app.use("/forms", forms);
app.use("/posts", post);
app.use("/activity", activity);
app.use("/category", category);
app.use("/audiobooks", audiobooks);
app.use("/wishlist", wishlist);
app.use("/party", party);
app.use("/country", country);
app.use("/audiobookReview", audiobookReview);
app.use("/useractivity", userActivity);
app.use("/order", order);
app.use("/playbackActivity", playbackActivity);
app.use("/contact", contact);

app.use(passport.initialize());
app.use(passport.session());
