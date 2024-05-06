const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require("body-parser");
const mongoose = require('mongoose');



// Connect to mongoose
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Schemas
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const exerciseSchema = new mongoose.Schema({
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    userId: {
      type: String,
      required: true
    }

  }
)

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Find all exercises by user ID
const findAllExercises = (userId) => {
  return new Promise((resolve, reject) => {

    // Find exercises
    Exercise.find({'userId': userId})
    .then(data => {
      console.log("Found exercises")
      resolve(data)
    })
    .catch(err => {
      console.error('Error: ', err)
      reject(err)
    })
  })
}

// Create and save exercise
const createAndSaveExercise = (description, duration, date, userId) => {
  return new Promise((resolve, reject) => {
    let newExercise = new Exercise({
      description: description,
      duration: duration,
      date: date,
      userId: userId
    });

    newExercise.save()
      .then(data => {
        console.log("Exercise save succesfully");
        resolve(data);
      })
      .catch(err => {
        console.error("Error:", err);
        reject(err);
      })
  })
}

// Create and save User
const createAndSaveUser = (username) => {
  return new Promise((resolve, reject) => {
    let newUser = new User({username: username});
  
    newUser.save()
      .then(data => {
        console.log("User saved successfully");
        resolve(data);
      })
      .catch(err => {
        console.err("Error:", err)
        reject(err);
      })

  })
};

// Find and return User by Name
const findUser = (username) => {
  return new Promise((resolve, reject) => {
    User.findOne({username: username})
    .then(data => {
      console.log("Found");
      resolve(data)
    })
    .catch(err => {
      console.error("Error:", err);
      reject(err);
    })
  })
}

// Find and return User by ID
const findUserById = (id) => {
  return new Promise((resolve, reject) => {
    User.findOne({_id: id})
    .then(data => {
      console.log("Found");
      resolve(data)
    })
    .catch(err => {
      console.error("Error:", err);
      reject(err);
    })
  })
}

// Find all Users
const findAllUsers = () => {
  return new Promise((resolve, reject) => {
    User.find().
    then(data => {
      console.log("All users data");
      resolve(data)
    })
    .catch(err => {
      console.error("Error:", err);
      reject(err);
    })
  })
}


app.use(cors())
app.use(express.static('public'))

// Body parser to read html file
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Post request for creating new user
app.post('/api/users/', async (req, res) => {
  let username = req.body.username;

  try {
    // Create and save new user
    await createAndSaveUser(username);
  
    // Return new create user
    const user = await findUser(username);
    res.json({username: user.username, _id: user._id})

  } catch (err) {
    console.error("Error: ", err);
  }
})

// Post request for saving new exercise
app.post('/api/users/:_id/exercises/', async (req, res) => {
  try {
    const userId = req.params._id;
    const description = req.body.description;
    const duration = req.body.duration;
    let date = req.body.date;

    // If no date
    if (!date) {
      date = new Date();
    } else {
      try {
        date = new Date(date);
      } catch(err) {
        console.error("Invalid date");
        date = new Date();
      }
    }

    // Get user data
    let user;
    try {
      user = await findUserById(userId);
    }  catch (err) {
      res.json({Error: 'Invalid user id'})
    }

    const newExercise = await createAndSaveExercise(description, duration, date, user._id);
    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    })
    

  } catch (err) {
    console.error("Error: ", err);
  }
})

// Get request to get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await findAllUsers();
    res.json(users);
  } catch (err) {
    console.error("Error: ", err);
  }
})

// Get request to see logs for specific user
app.get('/api/users/:_id/logs/', async (req,res) => {
  try {
    // Get user ID
    const userId = req.params._id;

    // Get extra parameters
    let from = req.query.from;
    let to = req.query.to;
    let limit = req.query.limit;

    // Check date from
    if (!from) {
      from = null;
    } else {
      try {
          from = new Date(from);
          if (isNaN(from.getTime())) {
              console.error("Invalid date");
              from = null;
          }
      } catch(err) {
          console.error("Invalid date");
          from = null; 
      }
    }

    // Check date to
    if (!to) {
      to = null;
    } else {
      try {
          to = new Date(to);
          if (isNaN(to.getTime())) {
              console.error("Invalid date");
              to = null;
          }
      } catch(err) {
          console.error("Invalid date");
          to = null; 
      }
    }

    // Get user data
    let user;
    try {
      user = await findUserById(userId);
    }  catch (err) {
      res.json({Error: 'Invalid user id'})
    }
    

    // Get users exercises
    let exercises;
    try {
      exercises = await findAllExercises(userId);
    } catch (err) {
      res.json({Error: 'There are no exercises'})
    }

    // Set limit
    let limitExercises;
    if (!limit) {
      limitExercises = exercises.length;
    } else {
      try {
        if (parseInt(limit) > exercises.length || isNaN(parseInt(limit))) {
          limitExercises = exercises.length;
        } else {
          limitExercises = parseInt(limit);
        }
      } catch (err) {
        limitExercises = exercises.length
        console.error("Error: wrong data format")
      }
    }
    
    // Exercises with modified dates
    let exercisesDates = [];
    for (i = 0; i < limitExercises; i++) {
      if ((!from || new Date(exercises[i].date) > from) || (!to || new Date(exercises[i].date) < to)) {
                exercisesDates.push({
                    description: exercises[i].description,
                    duration: exercises[i].duration,
                    date: new Date(exercises[i].date).toDateString()
                });
    }
  }

    // Respond with JSON object
    res.json({
      username: user.username,
      count: limitExercises,
      _id: user._id,
      log: exercisesDates})
  } catch (err) {
    console.error("Error: ", err)
  }
})




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
