/**
 * VideoController
 *
 * @description :: Server-side logic for managing videos
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird'),
	_ = require('lodash'),
	elasticsearch = require('replay-elastic'),
	Query = require('replay-schemas/Query'),
	Video = require('replay-schemas/Video'),
	Tag = require('replay-schemas/Tag');

// trick sails to activate restful API to this controller
sails.models.video = {};

module.exports = {

	find: function(req, res, next) {
		validateFindRequest(req)
			.then(saveUserQuery)
			.then(buildMongoQuery)
			.then(performMongoQuery)
			.then(performElasticQuery)
			.then(intersectResults)
			.then(function(results) {
				return res.json(results);
			})
			.catch(function(err) {
				return res.serverError(err);
			});
	},

	update: function(req, res, next) {
		validateUpdateRequest(req)
			.then(performUpdate)
			.then(function() {
				return res.ok();
			})
			.catch(function(err) {
				return res.serverError(err);
			});
	}
};

function validateFindRequest(req) {
	return new Promise(function(resolve, reject) {
		// make sure we have at least one attribute
		if (!req.query) {
			return reject(new Error('Empty query is not allowed.'));
		}

		// validate boundingShapeCoordinates is JSON parsable (since the array would be passed as string)
		if (req.query.boundingShapeCoordinates) {
			try {
				JSON.parse(req.query.boundingShapeCoordinates);
			} catch (e) {
				return reject(new Error('boundingShapeCoordinates is not parsable.'));
			}
		}

		if (req.query.tagsIds) {
			try {
				JSON.parse(req.query.tagsIds);
			} catch (e) {
				return reject(new Error('tagsIds is not parsable.'));
			}
		}

		resolve(req);
	});
}

function validateUpdateRequest(req) {
	return new Promise(function(resolve, reject) {
		// make sure we have at least one attribute
		if (!req.query) {
			return reject(new Error('Empty update is not allowed.'));
		} else if (req.query && Object.keys(req.body).length === 1 && req.body.tag) {
			// allow update of specific fields only //
			return resolve(req);
		}

		reject(new Error('Update is not allowed for the specified fields.'));
	});
}

// make sure we have at least one query param
function hasAnyQueryParam(query) {
	if (query.fromVideoTime || query.toVideoTime ||
		query.minVideoDuration || query.minVideoDuration || query.copyright ||
		query.minTraceHeight || query.minTraceWidth || query.source ||
		(query.boundingShapeType && query.boundingShapeCoordinates)) {
		return true;
	}
}

function saveUserQuery(req) {
	var coordinates, tagsIds;

	// parse some specific fields if they exist
	if (req.query.boundingShapeCoordinates) {
		coordinates = JSON.parse(req.query.boundingShapeCoordinates);
	}

	if (req.query.tagsIds) {
		tagsIds = JSON.parse(req.query.tagsIds);
	}

	return Query.create({
		fromVideoTime: req.query.fromVideoTime,
		toVideoTime: req.query.toVideoTime,
		minVideoDuration: req.query.minVideoDuration,
		maxVideoDuration: req.query.maxVideoDuration,
		copyright: req.query.copyright,
		minTraceHeight: req.query.minTraceHeight,
		minTraceWidth: req.query.minTraceWidth,
		minMinutesInsideShape: req.query.minMinutesInsideShape,
		sourceId: req.query.sourceId,
		tagsIds: tagsIds,
		boundingShape: {
			type: req.query.boundingShapeType,
			coordinates: coordinates
		}
	});
}

function buildMongoQuery(query) {
	// build the baseline of the query
	var mongoQuery = {
		status: 'ready'
	};

	// append the fields the user specified

	if (query.fromVideoTime) {
		mongoQuery.startTime = {
			$gte: query.fromVideoTime
		};
	}

	if (query.toVideoTime) {
		mongoQuery.endTime = {
			$lte: query.toVideoTime
		};
	}

	if (query.minVideoDuration) {
		mongoQuery.durationInSeconds = {
			$gte: query.minVideoDuration
		};
	}

	if (query.maxVideoDuration) {
		mongoQuery.durationInSeconds = {
			$lte: query.maxVideoDuration
		};
	}

	if (query.sourceId) {
		mongoQuery.sourceId = query.sourceId;
	}

	if (query.tagsIds && query.tagsIds.length > 0) {
		mongoQuery.tags = {
			$in: query.tagsIds
		};
	}

	// return the original query for later use, and the built mongo query
	return Promise.resolve({ query: query, mongoQuery: mongoQuery });
}

function performMongoQuery(queries) {
	// extract mongo query from the previous build function
	var mongoQuery = queries.mongoQuery;

	console.log('Performing mongo query:', JSON.stringify(mongoQuery));

	return Video.find(mongoQuery).populate('tags')
		.then(function(videos) {
			// set the result videos in the returned object
			queries.videos = videos;
			return Promise.resolve(queries);
		});
}

function performElasticQuery(mongoQueryResult) {
	// build the result object
	var result = {
		mongoResult: mongoQueryResult.videos,
		elasticResult: undefined
	};

	// extract the video results from mongo as well as the original query object
	var videosFromMongo = mongoQueryResult.videos;
	var query = mongoQueryResult.query;

	var videosIds = getVideosIds(videosFromMongo);

	// last case is special; if we have boundingShape in query, then query Elastic as well
	if (query.boundingShape.coordinates) {
		// search metadatas with the bounding shape
		return elasticsearch.searchVideoMetadata(query.boundingShape.coordinates, videosIds, ['videoId'])
			.then(function(resp) {
				// if user wants the results to sum up to a minimum time inside shape, make sure it conforms to this restriction
				if (query.minMinutesInsideShape && query.minMinutesInsideShape < getMetadataDurationInMinutes(resp.hits.hits)) {
					return Promise.resolve();
				}
				// set the hits in result object
				result.elasticResult = resp.hits.hits;
				return Promise.resolve(result);
			});
	}

	// case no special method had to be taken, just return the result
	return Promise.resolve(result);
}

function intersectResults(results) {
	var mongoResults = results.mongoResult;
	var elasticResults = results.elasticResult;

	var intersectionResults;
	// make sure we have results from elastic, since we might not query elastic every time
	if (elasticResults && elasticResults.length) {
		// remove duplicates
		elasticResults = removeDuplicates(elasticResults, 'fields.videoId[0]');

		// intersect results
		intersectionResults = _.intersectionWith(mongoResults, elasticResults, function(mongoVideo, elasticHit) {
			if (mongoVideo.id === elasticHit.fields.videoId[0]) {
				return true;
			}
			return false;
		});
	} else {
		intersectionResults = mongoResults;
	}

	return Promise.resolve(intersectionResults);
}

function mapList(list, mapField) {
	return _.map(list, mapField);
}

function removeDuplicates(list, uniqueField) {
	return _.uniq(list, uniqueField);
}

function getVideosIds(videos) {
	// remove duplicate entries
	var uniqueVideos = removeDuplicates(videos, 'id');
	// convert to list of ObjectId
	var ids = mapList(uniqueVideos, 'id');

	return ids;
}

function performUpdate(req) {
	var updateQuery = {};

	if (req.body.tag) {
		return findOrCreateTagByTitle(req.body.tag)
			.then(function(tag) {
				updateQuery.$addToSet = {
					tags: tag._id
				};
				return updateVideo(req.params.id, updateQuery);
			});
	}

	return updateVideo(req.params.id, updateQuery);
}

// find a Tag with such title or create one if not exists.
function findOrCreateTagByTitle(title) {
	// upsert: create if not exist; new: return updated value
	return Tag.findOneAndUpdate({
		title: title
	}, {
		title: title
	}, {
		upsert: true,
		new: true
	});
}

function updateVideo(id, updateQuery) {
	console.log('Updating video by id', id, 'Update is:', updateQuery);
	return Video.findOneAndUpdate({
		_id: id
	}, updateQuery);
}

function getMetadataDurationInMinutes(metadata) {
	// ceil so if length is less than 60, we'd get 1
	return Math.ceil(metadata.length / 60);
}
