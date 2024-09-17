const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()


// mongo models
mongoose.connect(process.env.MONGO_URI)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
})
const User = mongoose.model('User', userSchema)

const exerciseSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: false },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
})
const Exercise = mongoose.model('Exercise', exerciseSchema)



app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({ extended: false }))

app.post('/api/users', async (req, res) => {
  let username = req.body.username
  
  try {
    const user = await User.findOneAndUpdate(
      { username: username },
      { username: username },
      { upsert: true, new: true }
    );

    res.json({ username: user.username, _id: user._id });

  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/users/', async (req, res) => {
  const allUsers = await User.find({})
  res.json(allUsers)
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  let userId = req.params._id
  let user = await User.findById(userId)

  let { description, duration, date } = req.body

  date = date || new Date().toDateString()
  let exerciseObject = await Exercise.create({ username: user.username, description: description, duration: duration, date: date })
  res.json({ username: user.username, description: exerciseObject.description, duration: exerciseObject.duration, date: new Date(exerciseObject.date).toDateString(), _id: userId })
})

app.get('/api/users/:_id/logs', async (req, res) => {
  let { from, to, limit } = req.query;
  let user = await User.findById(req.params._id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let dateFilter = {};
  if (from) {
    dateFilter.$gte = new Date(from);
  }
  if (to) {
    dateFilter.$lte = new Date(to);
  }

  let filter = { username: user.username };
  if (Object.keys(dateFilter).length > 0) {
    filter.date = dateFilter;
  }

  let query = Exercise.find(filter, { description: 1, duration: 1, date: 1 });
  if (limit) {
    query = query.limit(parseInt(limit));
  }

  let allExercises = await query.exec();

  allExercises = allExercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: new Date(exercise.date).toDateString()
  }));

  let response = {
    username: user.username,
    count: allExercises.length,
    _id: user._id.toString(),
    log: allExercises
  };

  res.json(response);
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
