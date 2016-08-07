var promise = require('bluebird'),
	FFmpegWrapper = require('replay-ffmpeg');
var Standards = require('../enums/ViewStandards'),
	TransportTypes = require('../enums/TransportTypes');

module.exports = ViewStandards;

function ViewStandards() {
	var realizeStandardCaptureMethod = function(transportType, standardType) {
		var command;
		switch (standardType.standard) {
			case 'VideoStandard':
				switch (standardType.version) {
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
							default:
								return promise.reject('cannot resolve capture method');
						}
						break;
					default:
						return promise.reject('cannot resolve capture method');
				}
				break;
			case 'stanag':
				switch (standardType.version) {
					case '4609':
						command = FFmpegWrapper.captureMuxedVideoTelemetry;
						break;
					default:
						return promise.reject('cannot resolve capture method');
				}
				break;
			default:
				return promise.reject('cannot resolve capture method');
		}
		return promise.resolve(command);
	};

	return {
		realizeStandardCaptureMethod: realizeStandardCaptureMethod
	};
}
