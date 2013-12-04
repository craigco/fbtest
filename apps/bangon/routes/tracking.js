
var mongodb = null;

exports.setDB = function(db) {
    mongodb = db;
}

exports.invitesSent = function(req, res) {

  var invites = {
    uid:          req.body.uid,
    invites_sent: req.body.invites_sent
  };

  mongodb.save(invites, "invitesSent", function(error) {
    if (error) {
      console.log("Error logging friend invites information");
    }
  });

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

exports.logReturningUser = function(userid, callback) {
  var visit = {
    fbid: userid
  };

  mongodb.save(visit, "sitevisits", function(error) {
    if (error) {
      console.log("Error logging site visit information");
      callback(error);
    } else {
      callback();
    }
  });
};

