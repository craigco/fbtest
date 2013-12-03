
var FB              = require('../../../fb'),
    Step            = require('step'),

    config          = require('../config');

FB.options({
    appId:          config.facebook.appId,
    appSecret:      config.facebook.appSecret,
    redirectUri:    config.facebook.redirectUri
});


var verbose = true;

exports.invitesSent = function(req, res) {
  var uid          = req.body.uid;
  var invites_sent = req.body.invites_sent;
  internalLog("UID: " + uid);
  internalLog("INVITES_SENT: " + invites_sent);

  res.end();
};

exports.logNewUser = function(user) {

    // user.country
    // user.locale
    // user.age.min
    // user.age.max

    var country;
    var locale;
    var ageMin;
    var ageMax;

    if (user.country) {
        country = user.country;
    }

    if (user.locale) {
        locale = user.locale;
    }

    if (user.age) {
        if (user.age.min) {
            ageMin = user.age.min;
        }

        if (user.age.max) {
            ageMax = user.age.max;
        }
    }

    internalLog("NEWUSER");
    internalLog("COUNTRY: " + country);
    internalLog("LOCALE: " + locale);
    internalLog("AGE_MIN: " + ageMin);
    internalLog("AGE_MAX: " + ageMax);
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
