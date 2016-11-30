var mainRoutine = require('./mainRoutine');

var index = parseInt(process.env.INDEX, 10);

if (isNaN(index)) {
	throw new Error('Process index specified is not a number!');
} else {
	mainRoutine()
		.catch(function(err) {
			console.error(err);
			process.exit();
		});
}
