var BusService = require('BusService');

BusService = new BusService(process.env.REDIS_HOST, process.env.REDIS_PORT);
var message = {
    params: {
    	sourceId: 123,
        provider: 'kaltura',
        providerId: 'someKalturaId',
    	videoName: 'coolVideo.ts',
        videoRelativePath: 'relative/path/to/video',
        dataRelativePath: 'sample.data',
        receivingMethod: {
            standard: 'VideoStandard',
            version: 1.0
        }
    }
};
BusService.produce('NewVideosQueue', message);
