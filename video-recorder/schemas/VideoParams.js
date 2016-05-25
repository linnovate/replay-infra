var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var videoParamsSchema = new Schema({
  karonId: {
    type: Number,
    required: true,
    unique: true
  },
  receivingMethod: {
    standard: { type: String, required: true },
    version: { type: Number, required: true }
  },
  receivingParams: {
    videoPort: { type: Number, required: true },
    telemetryPort: Number
  }
});

var VideoParams = mongoose.model('VideoParams', videoParamsSchema);

module.exports = VideoParams;