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
  	/*id: {
  		type: 'string',
  		required: true
  	},*/

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

/*
  beforeValidation: function (values, next) {
    if (typeof values.admin !== 'undefined') {
      if (values.admin === 'unchecked') {
        values.admin = false;
      } else  if (values.admin[1] === 'on') {
        values.admin = true;
      }
    }
     next();
  },

  beforeCreate: function (values, next) {

    // This checks to make sure the password and password confirmation match before creating record
    if (!values.password || values.password != values.confirmation) {
      return next({err: ["Password doesn't match password confirmation."]});
    }

    require('bcrypt').hash(values.password, 10, function passwordEncrypted(err, encryptedPassword) {
      if (err) return next(err);
      values.encryptedPassword = encryptedPassword;
      // values.online= true;
      next();
    });
  }
*/
};
