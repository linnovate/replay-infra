var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var StreamingSourceSchema = new Schema({
    SourceID: {
        type: Number,
        required: true,
        unique: true
    },
    SourceName: {
        type: String,
        required: true
    },
    SourceType: {
        type: String,
        required: true
    },
    SourceIP: {
        type: String,
        required: true
    },
    SourcePort: {
        type: Number,
        required: true
    },
    StreamingMethod: {
        standard: {
            type: String,
            required: true
        },
        version: {
            type: String,
            required: true
        }
    },
    StreamingStatus: {
        status: {
            type: String,
            required: true,
            default:'NONE'
        },
        updated_at: {
            type: Date,
            default: Date.now()
        }
    }
});

var StreamingSource = mongoose.model('StreamingSource', StreamingSourceSchema);

module.exports = StreamingSource;