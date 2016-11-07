var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var SourceSchema = new Schema({

	name: {
		type: String,
		required: true
	}},
	{
		timestamps: true
	});

var Source = mongoose.model('Source', SourceSchema);

module.exports = Source;
