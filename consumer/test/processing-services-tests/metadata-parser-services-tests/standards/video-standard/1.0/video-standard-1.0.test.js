var path = require('path');

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var config = require('../../../../../config'),
	Parser = require('../../../../../../processing-services/metadata-parser-service/standards/video-standard/1.0');

var _expectedParsedDataObjectsPath = 'expected_parsed_data.json';
var _dataAsString, _expectedParsedDataObjects;
var _expectedDataLength = 20;
var _videoId = '5799d24778b1f56a081e7029';

describe('video standard 1.0 parser tests', function() {
	before(function(done) {
		config.resetEnvironment();
		var message = config.generateValidMessage();
		var fullpathToData = path.join(process.env.STORAGE_PATH, message.dataRelativePath);
		fs.readFileAsync(fullpathToData, 'utf8')
			.then(function(dataAsString) {
				_dataAsString = dataAsString;
				return Promise.resolve();
			})
			.then(function() {
				var fullpathToParsedData = path.join(process.env.STORAGE_PATH, _expectedParsedDataObjectsPath);
				return fs.readFileAsync(fullpathToParsedData, 'utf8');
			})
			.then(function(expectedDataAsString) {
				_expectedParsedDataObjects = JSON.parse(expectedDataAsString);
				return Promise.resolve();
			})
			.then(function() {
				done();
			})
			.catch(function(err) {
				if (err) {
					done(err);
				}
			});
	});

	describe('sanity tests', function() {
		it('should parse xml to 20 objects', function(done) {
			var params = generateParamsForParser();

			var dataAsObjects = Parser.parse(_dataAsString, params);
			expect(dataAsObjects).to.be.instanceOf(Array);
			expect(dataAsObjects).to.have.lengthOf(_expectedDataLength);
			done();
		});

		it('should parse xml to expected objects', function(done) {
			var params = generateParamsForParser();

			var dataAsObjects = Parser.parse(_dataAsString, params);
			console.log('dataAsObjects first:', JSON.stringify(dataAsObjects[1]));
			console.log('expected DataAsObects first:', JSON.stringify(_expectedParsedDataObjects[1]));
			expect(dataAsObjects).to.be.instanceOf(Array);
			expect(dataAsObjects).to.deep.have.same.members(_expectedParsedDataObjects);
			done();
		});
	});

	describe('bad input tests', function() {

	});
});

function generateParamsForParser() {
	var message = config.generateValidMessage();
	return {
		sourceId: message.sourceId,
		videoId: _videoId,
		receivingMethod: message.receivingMethod
	};
}
