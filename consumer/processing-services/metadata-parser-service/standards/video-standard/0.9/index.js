module.exports.parse = function(data) {
	// parse the data to objects, then:
	// 1. try to find the sourceId of EACH of the data by looking to the appropriate field
	// (as it probably going to be chunk consisted many sources)
	// 2. try to find the videoId of EACH of the data
	// (by crossing between the time the telemetry was recorded and a corresponding
	// video with the same sourceId which started recording the same time )
	// return videoMetadatas array
	return {};
};
