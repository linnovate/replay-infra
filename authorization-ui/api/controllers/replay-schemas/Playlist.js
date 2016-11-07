var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var PlaylistSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	ownerId: {
		type: String,
		required: true
	},
	missions: [{
		type: Schema.Types.ObjectId,
		ref: 'Mission'
	}]},
	{
		timestamps: true
	});

var Playlist = mongoose.model('Playlist', PlaylistSchema);

module.exports = Playlist;
