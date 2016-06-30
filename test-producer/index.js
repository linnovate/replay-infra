var BusService = require('replay-bus-service');

var busService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);
var message = {
	params: {
		sourceId: 123,
		videoName: 'sample.ts',
		videoRelativePath: 'sample.ts',
		dataRelativePath: 'sample.data',
		receivingMethod: {
			standard: 'VideoStandard',
			version: '1.0'
		}
	}
};
busService.produce('NewVideosQueue', message);
