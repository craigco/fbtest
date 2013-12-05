
var mongodb = null;

exports.setDB = function(db) {
    mongodb = db;
}

exports.invitesSent = function(req, res) {

  var invites = {
    uid:          req.body.uid,
    invites_sent: req.body.invites_sent
  };

  mongodb.save(invites, "invitessent", function(error) {
    if (error) {
      console.log("Error logging friend invites information");
    }
  });

  res.end();
};

exports.logNewUser = function(user, useragent, callback) {

  // user.country
  // user.locale
  // user.age.min
  // user.age.max

  var info = {
    info: user,
    agent: useragent
  };

  mongodb.save(info, "tracking", function(error) {
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

exports.logNoPermissions = function(callback) {
  console.log("logNoPermissions");
  var nopermissions = {
    time: new Date()
  };

  mongodb.save(nopermissions, "deniedpermissions", function(error) {
    if (error) {
      console.log("Error logging no permission information");
      callback(error);
    } else {
      callback();
    }
  });
};

