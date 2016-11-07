require('mongoose-geojson-schema');
var mongoose = require('mongoose');
var VideoCompartmentSchema = require('./common-nested-schemas/VideoCompartment');
var Schema = mongoose.Schema;

// create a schema
var MissionSchema = new Schema({
	missionName: {
		type: String,
		required: true
	},
	sourceId: {
		type: String,
		required: true
	},
	boundingPolygon: mongoose.Schema.Types.GeoJSON,
	startTime: {
		type: Date,
		required: true
	},
	endTime: {
		type: Date,
		validate: validateGreaterThanStartTime,
		required: true
	},
	durationInSeconds: {
		type: Number
	},
	destination: {
		type: String,
		required: true
	},
	tags: [{
		type: Schema.Types.ObjectId,
		ref: 'Tag'
	}],
	videoCompartments: [VideoCompartmentSchema],
	videoStatus: {
		type: String,
		enum: ['new', 'updated', 'deleted', 'error', 'handled', 'handledDeleted'],
		default: 'new',
		required: true
	}},
	{
		timestamps: true
	});

var Mission = mongoose.model('Mission', MissionSchema);
module.exports = Mission;

MissionSchema.pre('save', calculateDuration);
MissionSchema.pre('update', calculateDuration);
VideoCompartmentSchema.pre('save', calculateDuration);
VideoCompartmentSchema.pre('update', calculateDuration);

Mission.validateMissionExists = function (missionId, permissions) {
	console.log('Validating that mission with id %s exists and user has permissions for it...', missionId);

	return findMissions(missionId, permissions)
		.then((mission) => {
			if (mission) {
				return Promise.resolve(mission);
			}

			return Promise.reject(new Error(`Mission with id ${missionId} does not exist or user has no permissions for it.`));
		});
};

function buildPermissionsQueryCondition(permissions) {
	console.log('Building permissions query condition...');
	try {
		var query = { $or: [] };
		for (var i = 0; i < permissions.length; i++) {
			query.$or.push({
				destination: permissions[i].id[0]
			});
			if (i === permissions.length - 1) {
				return query;
			}
		}
	} catch (err) {
		console.log('Error in building mongo query condition for permissions.');
		console.log(err);
		throw err;
	}
}
Mission.buildPermissionsQueryCondition = buildPermissionsQueryCondition;

function findMissions(missionId, permissions) {
	var query = {
		$and: [
			{ _id: missionId },
			buildPermissionsQueryCondition(permissions)
		]
	};
	return Mission.findOne(query);
}

function validateGreaterThanStartTime(obj) {
	if (obj.startTime <= obj.endTime) {
		return false;
	}

	return true;
}

function calculateDuration(next) {
	var self = this;
	var differenceInMillis = self.endTime - self.startTime;
	self.durationInSeconds = differenceInMillis / 1000;
	next();
}
