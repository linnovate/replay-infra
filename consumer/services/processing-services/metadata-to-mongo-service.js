var VideoMetadata = require('replay-schemas/VideoMetadata');

module.exports.start = function(metadatas) {
	console.log('MetadataToMongo service started.');

	saveToMongo(metadatas);
};

function saveToMongo(videoMetadatas) {
	VideoMetadata.insertMany(videoMetadatas, function(err, objs) {
		if (err) {
			console.log(err);
		} else {
			console.log('Bulk insertion to mongo succeed.');
		}
	});
}
