module.exports.start = function(metadatas) {
	console.log('MetadataToElastic service started.');

	saveToElastic(metadatas);
};

function saveToElastic(videoMetadatas) {
	// convert xmls to bulk request object for elastic
	var bulkRequest = videoMetadatasToElasticBulkRequest(videoMetadatas);

	global.elasticsearch.bulk({
		body: bulkRequest
	}, function(err, resp) {
		if (err) {
			console.log(err);
		} else {
			console.log('Bulk insertion to elastic succeed.');
		}
	});
}

function videoMetadatasToElasticBulkRequest(videoMetadatas) {
	var bulkRequest = [];

	videoMetadatas.forEach(function(videoMetadata) {
		// efficient way to remove auto generated _id
		videoMetadata._id = undefined;

		// push action
		bulkRequest.push({
			index: {
				_index: 'videometadatas',
				_type: 'videometadata'
			}
		});

		// push document
		bulkRequest.push(videoMetadata);
	});

	return bulkRequest;
}
