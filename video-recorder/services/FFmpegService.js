var ffmpeg = require('fluent-ffmpeg');
var promise = require('bluebird'),
	event = require('./EventService');
//var TelemetryEnum = require('./TelemetryEnum.js');

const FFMPEGTIMEOUT =  30 * 60 * 1000;

module.exports = {

	// Params object (e.g{host:<host>,port:<port>,Directory:<dir/dir2>,file:<filename>,muxedTelemetry:<true/false>,duration:<sec/hh:mm:ss.xxx>})	

	captureMuxedVideoTelemetry: function(params){

		console.log('capturing muxed!!!!!');
	 	// Building the FFmpeg command	
	 	var builder = new promise(function(resolve,reject){
			// FFmpeg command initialization
			var command = ffmpeg();
	 		// Resolving the command forward
	 		resolve(command);
	 	});

	 	builder	 	

	 	.then(function(command){
	 		return InitializeInputs(command,params);	 		
	 	})	 		

	 	.then(function(command){
	 		return VideoOutput(command,params);
	 	})

	 	.then(function(command){
	 		return VideoOutput360p(command,params);
	 	})
		
	 	.then(function(command){
	 		return VideoOutput480p(command,params);
	 	})

	 	.then(function(command){
	 		return ExtractData(command,params);
	 	})	 
	 	
	 	.then(function(command){
	 		return SetEvents(command);
	 	});	 

	 	return builder;		 	
	},	

	captureVideoWithoutTelemetry: function(params){		
		// Building the FFmpeg command	
	 	var builder = new promise(function(resolve,reject){
			// FFmpeg command initialization
			var command = ffmpeg();
	 		// Resolving the command forward
	 		resolve(command);
	 	});

	 	builder	 	

	 	.then(function(command){
	 		return InitializeInputs(command,params);	 		
	 	})	 		

	 	.then(function(command){
	 		return VideoOutput(command,params);
	 	})

	 	.then(function(command){
	 		return VideoOutput360p(command,params);
	 	})
		
	 	.then(function(command){
	 		return VideoOutput480p(command,params);
	 	})

	 	.then(function(command){
	 		return SetEvents(command);
	 	})	 		
	},

	captureTelemetryWithoutVideo: function(params){
		// Building the FFmpeg command	
	 	var builder = new promise(function(resolve,reject){
			// FFmpeg command initialization
			var command = ffmpeg();
	 		// Resolving the command forward
	 		resolve(command);
	 	});

	 	builder	 	

	 	.then(function(command){
	 		return InitializeInputs(command,params);	 		
	 	})	 		

	 	.then(function(command){
	 		return ExtractData(command,params);
	 	})	 
	 	
	 	.then(function(command){
	 		return SetEvents(command);
	 	})		
	}
}

function SetEvents(command){	
	command.on('end', function() {
		event.emit('FFmpegDone');
   		console.log('Processing finished !');
   		command.kill('SIGKILL');

   	})
   	.on('start', function(commandLine) {
    console.log('Spawned Ffmpeg with command: ' + commandLine);
  	})
  	.on('error', function(err){
  		console.log(err);
  		command.kill('SIGKILL');
  	})
   	.on('progress',function(progress){
    	console.log(JSON.stringify(progress));
    })
    .run();    

    return command;			
}

function ExtractData(command,params){
	command	
	.output(params.dir+'/'+params.file+'.txt')
	.duration(params.duration)	
	.outputOptions([ '-map data-re', '-codec copy', '-f data', '-y']);
 	

 	return command;		 		
}

function VideoOutput360p(command,params){		
	command	
 	.output(params.dir+'/'+params.file+'320p'+'.mp4')
 	.duration(params.duration)
 	.outputOptions(['-y']) 	
 	.format('mp4')
	.size('480x360');

	return command;
}

function VideoOutput480p(command,params){		
	command	
	.output(params.dir+'/'+params.file+'480p'+'.mp4')
	.duration(params.duration)
	.outputOptions(['-y'])
	.format('mp4')
	.size('640x480');

	return command;
}

function VideoOutput(command,params){		
	command	
 	.output(params.dir+'/'+params.file+'.mp4')
 	.outputOptions(['-y'])
 	.duration(params.duration)
 	.format('mp4');	

 	return command;
}

function InitializeInputs(command,params){

	params.inputs.forEach(function(value){
		command.input(value);
	});
	
	return command;
}

