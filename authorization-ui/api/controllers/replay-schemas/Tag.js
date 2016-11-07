var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// create a schema
var TagSchema = new Schema({
	title: {
		type: String,
		required: true,
		unique: true
	}
}, {
	timestamps: true
});

var Tag = mongoose.model('Tag', TagSchema);

module.exports = Tag;
