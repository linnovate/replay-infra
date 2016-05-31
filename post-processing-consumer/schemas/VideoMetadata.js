var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var VideoMetadataSchema = new Schema({
  sourceId: {
    type: Number,
    required: true
  },
  videoId: {
    type: String
  },
  receivingMethod: {
    standard: { type: String, required: true },
    version: { type: Number, required: true }
  },
  data: {
    type: Schema.Types.Mixed
  }
});

var VideoMetadata = mongoose.model('VideoMetadata', VideoMetadataSchema);

module.exports = VideoMetadata;