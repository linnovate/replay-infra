/**
 * VideoController
 *
 * @description :: Server-side logic for managing videos
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Promise = require('bluebird'),
	elasticsearch = require('replay-elastic'),
	ObjectId = require('mongoose').Types.ObjectId,
	Query = require('replay-schemas/Query'),
	Video = require('replay-schemas/Video'),
	Tag = require('replay-schemas/Tag');

// trick sails to activate restful API to this controller
sails.models.video = {};

module.exports = {

	find: function(req, res, next) {
		validateFindRequest(req)
			.then(saveQuery)
			.then(buildQuery)
			.then(performQuery)
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
		}
		// allow update of specific fields only
		else if (req.query && Object.keys(req.body).length === 1 && req.body.tag) {
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

function saveQuery(req) {
	var coordinates;
	if (req.query.boundingShapeCoordinates) {
		coordinates = JSON.parse(req.query.boundingShapeCoordinates);
	}

	return Query.create({
		fromVideoTime: req.query.fromVideoTime,
		toVideoTime: req.query.toVideoTime,
		minVideoDuration: req.query.minVideoDuration,
		maxVideoDuration: req.query.maxVideoDuration,
		copyright: req.query.copyright,
		minTraceHeight: req.query.minTraceHeight,
		minTraceWidth: req.query.minTraceWidth,
		sourceId: req.query.sourceId,
		tagsIds: JSON.parse(req.query.tagsIds),
		boundingShape: {
			type: req.query.boundingShapeType,
			coordinates: coordinates
		}
	});
}

function buildQuery(query) {
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

	// last case is special; if we have boundingShape in query, then query Elastic as well
	if (query.boundingShape.coordinates) {
		// search metadatas with the bounding shape
		return elasticsearch.searchVideoMetadata(query.boundingShape.coordinates)
			.then(function(resp) {
				// append the video ids of retrieved metadatas to query
				mongoQuery._id = {
					$in: getMetadataVideosIds(resp.hits.hits)
				};
				return Promise.resolve(mongoQuery);
			});
	}

	return Promise.resolve(mongoQuery);
}

function performQuery(query) {
	console.log('Performing query:', JSON.stringify(query));
	return Video.find(query).populate('tags');
}

function elasticHitsToIdList(elasticHits) {
	return _.map(elasticHits, function(hit) {
		return new ObjectId(hit._source.videoId);
	});
}

function removeDuplicateHits(elasticHits) {
	return _.uniq(elasticHits, function(hit) {
		return hit.videoId;
	});
}

function getMetadataVideosIds(elasticHits) {
	// remove duplicate entries
	var ids = removeDuplicateHits(elasticHits);
	// convert to list of ObjectId
	ids = elasticHitsToIdList(ids);

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
