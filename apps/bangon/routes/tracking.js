
var FB              = require('../../../fb'),
    Step            = require('step'),

    config          = require('../config');

FB.options({
    appId:          config.facebook.appId,
    appSecret:      config.facebook.appSecret,
    redirectUri:    config.facebook.redirectUri
});


var verbose = true;
var mongodb = null;

exports.setDB = function(db) {
    mongodb = db;
}

exports.invitesSent = function(req, res) {
  var uid          = req.body.uid;
  var invites_sent = req.body.invites_sent;
  internalLog("UID: " + uid);
  internalLog("INVITES_SENT: " + invites_sent);

  res.end();
};

exports.logNewUser = function(user, callback) {

  // user.country
  // user.locale
  // user.age.min
  // user.age.max

  mongodb.save(user, "tracking", function(error) {
    if (error) {
      console.log("Error logging new user information");
      callback(error);
    } else {
      callback();
    }
  });
};

exports.logReturningUser = function(userid) {

    internalLog("RETURNING_USER");
    internalLog("ID: " + userid);
};



function internalLog(data) {
    if (verbose) {
        console.log(data);
    }
}
