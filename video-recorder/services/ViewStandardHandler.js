var promise = require('bluebird'),
    FFmpegWrapper = require('./FFmpegWrapper'),
    Standards = require('../enums/ViewStandards'),
    TransportTypes = require('../enums/TransportTypes');

module.exports = ViewStandards;

function ViewStandards() {

    var realizeStandardCaptureMethod = function(transportType, standard) {
        var command;
        switch (standard) {
            case Standards.V1:
                command = FFmpegWrapper.captureMuxedVideoTelemetry;
                break;
            case Standards.V09:

                switch (transportType) {
                    case TransportTypes.VIDEO:
                        command = FFmpegWrapper.captureVideoWithoutTelemetry;
                        break;
                    case TransportTypes.TELEMETRY:
                        command = FFmpegWrapper.captureTelemetryWithoutVideo;
                        break;
                }
        }
        return promise.resolve(command);
    };

    return {
        realizeStandardCaptureMethod: realizeStandardCaptureMethod
    };
}
