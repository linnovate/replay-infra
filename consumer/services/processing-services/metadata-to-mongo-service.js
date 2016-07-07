module.exports.start = function(metadatas) {
	console.log('MetadataToMongo service started.');

	if (metadatas && metadatas.length > 0) {
		saveToMongo(metadatas);
	} else {
		console.log('No metadatas receieved.');
	}
};

function saveToMongo(videoMetadatas) {
	console.log('Saving to mongo...');

	global.models.videometadata.create(videoMetadatas, function(err, objs) {
		if (err) {
			console.log(err);
		} else {
			console.log('Bulk insertion to mongo succeed.');
		}
	});
}
