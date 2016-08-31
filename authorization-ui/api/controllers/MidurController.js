/**
 * UserController
 *
 * @module    :: Controller
 * @description :: Contains logic for handling requests.
 */
var moment = require('moment');
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

module.exports = {

  create: function(req, res, next) {

    var midurObj = {
     // id: guid(),
      name: req.param('name'),
      source: req.param('source'),
      start_time: req.param('start_time'),
      end_time: req.param('end_time'),
      destination: req.param('destination')
    }

    // Create a User with the params sent from
    // the sign-up form --> new.ejs
    Midur.create(midurObj, function userCreated(err, user) {

      if (err) {
        console.log(err);
        req.session.flash = {
          err: err
        }

        // If error redirect back to sign-up page
        res.end('error');
      }

      res.end('success');
    });
  },

  index: function(req, res, next) {

    Midur.find(function foundUsers(err, midur) {
      if (err) return next(err);
      // pass the array down to the /views/index.ejs page
      res.view({
        midur: midur,
        moment: moment
      });
    });
  },

  // process the info from edit view
  update: function(req, res, next) {

      var midurObj = {
     // id: guid(),
      name: req.param('name'),
      source: req.param('source'),
      start_time: req.param('start_time'),
      end_time: req.param('end_time'),
      destination: req.param('destination')
    }

    Midur.update(req.param('id'), midurObj, function midurUpdated(err) {
      if (err) {
        return res.end('error');
      }

      res.end('success');
    });
  },

  destroy: function(req, res, next) {

    Midur.findOne(req.param('id'), function foundMidur(err, midur) {
      if (err) res.end(err);

      if (!midur) res.end('midur doesn\'t exist.');

      Midur.destroy(req.param('id'), function midurDestroyed(err) {
        if (err) res.end(err);



      });

      res.end('success');

    });
  },

  findone: function(req, res, next) {

    Midur.findOne(req.param('id'), function foundMidur(err, midur) {
      if (err) res.end(err);

      res.end(JSON.stringify(midur));

    });
  }

};
