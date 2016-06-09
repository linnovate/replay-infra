var BusService = require('BusService');

BusService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);
var message = {
    params: {
    	sourceId: 123,
    	videoName: 'coolVideo.ts',
        videoRelativePath: 'relative/path/to/video',
        dataRelativePath: 'relative/path/to/data',
        receivingMethod: {
            standard: 'VisionStandard',
            version: 1.0
        }
    }
};
BusService.produce('NewVideosQueue', message);
