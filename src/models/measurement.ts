export{}
const mongoose = require('mongoose')

// Mongoose schema
const schema = new mongoose.Schema({
  measurementDate: {
    type: String,
  },
  temperature: {
    type: Number,
  },
  humidity: {
    type: Number,
  },
})
module.exports = mongoose.model('Measurement', schema)
