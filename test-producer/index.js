var BusService = require('BusService');

BusService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);
var message = {
    params: {
    	sourceId: 123,
    	videoName: 'sample.ts',
        videoRelativePath: 'sample.ts',
        dataRelativePath: 'sample.data',
        receivingMethod: {
            standard: 'VideoStandard',
            version: 1.0
        }
    }
};
BusService.produce('NewVideosQueue', message);
