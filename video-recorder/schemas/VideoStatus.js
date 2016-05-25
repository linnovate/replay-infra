var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var videoStatusSchema = new Schema({
  karonId: {
    type: Number,
    required: true,
    unique: true
  },
  videoStatus: {
    type: String,
    required: true
  },
  telemetryStatus: {
    type: String,
    required: true
  },
  updated_at: {
    type: Date,
    default: Date.now()
  }
});

var VideoStatus = mongoose.model('VideoStatus', videoStatusSchema);

module.exports = VideoStatus;