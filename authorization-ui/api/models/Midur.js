/**
 * User
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

  schema: true,

  attributes: {
  	name: {
  		type: 'string',
  		required: true
  	},

  	source: {
  		type: 'string',
  		required: true
  	},

  	start_time: {
  		type: 'date',
  		required: true
  	},

  	end_time: {
  		type: 'date',
  		required: true
  	},

	destination: {
  		type: 'string',
  		required: true
  	},

    toJSON: function() {
      var obj = this.toObject();
      delete obj._csrf;
      return obj;
    }
  }

};
