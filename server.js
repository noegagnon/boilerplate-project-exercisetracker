const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

var Schema = mongoose.Schema;

// create mode to save user info
var modelUser = new Schema({
  username: { type: String, unique: true }
});

// create model to save exercise
var modelExercise = new Schema({
  userId: { type: String, require: true },
  description: { type: String, require: true },
  duration: { type: Number, require: true },
  date: Date
});

var User = mongoose.model("user", modelUser);
var Exercise = mongoose.model("exercise", modelExercise);

// save a user
app.post("/api/exercise/new-user", function(req, res) {
  var randomNumber = Math.floor(Math.random() * 100000);
  var user = req.body.username;
  var utilisateur = new User({ username: user });
  console.log(utilisateur);
  // async
  utilisateur.save(function(err, data) {
    if (err) console.log(err);
    else console.log("user saved successfully" + data);
    res.json(utilisateur);
  });
});

// get an array of all users
app.get("/api/exercise/users", function(req, res) {
  User.find({}, function(err, data) {
    if (err) return console.log(err);
    res.json(data);
  });
});

// ajouter les exercises d'un user
app.post("/api/exercise/add", function(req, res) {
  var userId = req.body.userId;
  var description = req.body.description;
  var duration = req.body.duration;
  var date;

  if (!req.body.date) date = new Date();
  else {
    date = req.body.date;
  }

  User.findOne({ _id: userId }, function(err, userData) {
    if (err) {
      console.log(err);
      return res.json("Unknown user with _id");
    }
    console.log(userData);
    console.log("username" + userData.username);

    // create exercise to save
    var exercise = new Exercise({
      userId: userId,
      description: description,
      duration: duration,
      date: date
    });

    // save exercise
    exercise.save(function(err, exerciseData) {
      console.log(userId);
      if (err) return res.json(err.message);
      else console.log("exercise saved successfully" + exerciseData);
      userData.description = exerciseData.description;
      userData.duration = exerciseData.duration;
      userData.date = exerciseData.date.toISOString().slice(0, 10);
      console.log("user dat", userData);

      var obj = {
        username: userData.username,
        description: exerciseData.description,
        duration: exerciseData.duration,
        _id: userId,
        date: exerciseData.date.toDateString()
      };
      res.json(obj);
    });
  });
});

// get exercises for a user
// /api/exercise/log?{userId}[&from][&to][&limit]
app.get("/api/exercise/log", function(req, res) {
  console.log(req.query.userId);
  var username;
  var id;
  User.findOne({ _id: req.query.userId }, function(err, userData) {
    if (err) return res.json(err.message);

    username = userData.username;
    id = userData._id;

    Exercise.find({ userId: id }, function(err, exerciseData) {
      if (err) return console.log("erreur pour exercise" + err);

      var arrayLog = [];
      var count = 0;
      var dateExo;
      var limite;
      var dateTo;
      var dateFrom;

      // handle limit
      if (!req.query.limit || req.query.limit > exerciseData.length) {
        limite = exerciseData.length;
      } else limite = req.query.limit;

      // handle from date
      if (!req.query.from) {
        dateFrom = -Infinity;
      } else {
        dateFrom = new Date(req.query.from);
      }

      // handle to date
      if (!req.query.to) {
        dateTo = Infinity;
      } else {
        dateTo = new Date(req.query.to);
      }

      for (var i = 0; i < limite; i++) {
        dateExo = exerciseData[i].date;
        if (dateFrom <= dateExo && dateTo >= dateExo) {
          arrayLog.push({
            description: exerciseData[i].description,
            duration: exerciseData[i].duration,
            date: dateExo
          });
          count++;
        }
      }
      return res.json({
        username: username,
        id: id,
        count: count,
        log: arrayLog
      });
    });
  });
});

// Not found middleware. Any routes under this Doesn't work!
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
