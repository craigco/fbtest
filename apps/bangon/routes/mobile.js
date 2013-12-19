
var FB              = require('../../../fb'),
    Step            = require('step'),

    config          = require('../config'),
    tracking        = require('./tracking'),
    MongoDBProvider = require('../mongodbprovider').MongoDBProvider;

FB.options({
    appId:          config.facebook.appId,
    appSecret:      config.facebook.appSecret,
    redirectUri:    config.facebook.redirectUri
});

var verbose = true;

var mongodbprovider = new MongoDBProvider();

tracking.setDB(mongodbprovider);

exports.indexPost = function (req, res) {
  //console.log("indexPost");
  var signedRequest = FB.parseSignedRequest(req.body.signed_request, config.facebook.appSecret);

  var accessToken;

  if (signedRequest) {
    //console.log("signedRequest");
    if (!signedRequest.oauth_token) {
      //console.log("!oauth_token");
      // uninstalled user
      // log given user information

      var ua = req.headers['user-agent'],
        $ = {};

      if (/mobile/i.test(ua))
        $.Mobile = true;

      if (/like Mac OS X/.test(ua)) {
        $.iOS = /CPU( iPhone)? OS ([0-9\._]+) like Mac OS X/.exec(ua)[2].replace(/_/g, '.');
        $.iPhone = /iPhone/.test(ua);
        $.iPad = /iPad/.test(ua);
      }

      if (/Android/.test(ua))
        $.Android = /Android ([0-9\.]+)[\);]/.exec(ua)[1];

      if (/webOS\//.test(ua))
        $.webOS = /webOS\/([0-9\.]+)[\);]/.exec(ua)[1];

      if (/(Intel|PPC) Mac OS X/.test(ua))
        $.Mac = /(Intel|PPC) Mac OS X ?([0-9\._]*)[\)\;]/.exec(ua)[2].replace(/_/g, '.') || true;

      if (/Windows NT/.test(ua))
        $.Windows = /Windows NT ([0-9\._]+)[\);]/.exec(ua)[1];

      tracking.logNewUser(signedRequest.user, $, function () {
      });

      res.send("<script>window.top.location='" + FB.getLoginUrl({ scope: config.facebook.scope }) + "'</script>");

    } else {
      // this user has installed the app
      accessToken = signedRequest.oauth_token;
      //console.log("oauth_token");

      // check if publish_actions is granted
      FB.api('fql', { q: 'SELECT publish_actions FROM permissions WHERE uid=' + signedRequest.user_id, access_token: accessToken }, function(queryResponse) {
        if (!queryResponse || queryResponse.error) {
          console.log(!queryResponse ? 'error occurred' : queryResponse.error);
        }

        // if publish_actions permission is missing - go to login dialog
        if (!queryResponse.data[0] || !queryResponse.data[0].publish_actions || queryResponse.data[0].publish_actions == 0) {
          res.send("<script>window.top.location='" + FB.getLoginUrl({ scope: config.facebook.scope }) + "'</script>");

          res.end();
        }
      });
    }
  } else {
    //console.log("!signedRequest");
    accessToken = req.session.access_token;
    //console.log("accessToken= " + accessToken);
  }

  if (!accessToken) {
    //console.log("!accessToken");
    res.render('index', {
      title: 'bang.on'
    });
  } else {
    var userInfo;

    Step(
      function getUserDataFromGraphAPI() {
        FB.napi('/me', 'get', { access_token: accessToken }, this);
      },
      function checkForProfile(err, meAPIResult) {
        if (err) {
          throw(err);
        }

        userInfo = meAPIResult;

        mongodbprovider.findOne( { "fb.id": meAPIResult.id }, "users", this);
      },
      function getProfileInformationOrRenderView(error, document) {
        if (error) {
          console.log(error);
          throw(error);
        } else {
          if (document == null) {
            // no entry
            res.send("<script>window.top.location='" + FB.getLoginUrl({ scope: config.facebook.scope }) + "'</script>");
            return;
          } else if (document.profile == null) {
            // no profile
            //console.log("redirecting " + userInfo.id + " to get profile information");

            res.render('createprofile', {
              title: 'bang.on',
              user_first_name: userInfo.first_name,
              user_last_name: userInfo.last_name,
              appID: config.facebook.appId,
              uid: userInfo.id
            });

          } else {
            res.render('signedup', {
              title: 'bang.on',
              user_first_name: userInfo.first_name,
              user_last_name: userInfo.last_name,
              appID: config.facebook.appId,
              uid: userInfo.id
            });

            tracking.logReturningUser(userInfo.id, function(error) {
              if (error) {
                throw(error);
              }
            });
          }
        }
      }
    );
  }
};

exports.indexGet = function (req, res) {
  //console.log("indexGet");
  res.render('mobile_index', {
    title: 'bang.on',
    appID: config.facebook.appId,
    scope: config.facebook.scope
    });
};

exports.loginCallback = function (req, res) {
  console.log('loginCallback');
  console.log(req.body.accessToken);

  var user;

  Step(
    function getUserData() {
      console.log("getUserData");

      var parameters = {
        access_token: req.body.accessToken
      };

      FB.napi('/me', 'get', parameters, this);
    },
    function checkExtendedPermissions(err, result) {
      console.log("checkExtendedPermissions");
      if (err) {
        throw(err);
      }

      // wrap in facebook node
      user = {
        fb: result
      };

      // check if publish_actions is granted
      FB.napi('fql', { q: 'SELECT publish_actions FROM permissions WHERE uid=' + result.id, access_token: req.session.access_token }, this);
    },
    function saveNewUser(err, result) {
      console.log("saveNewUser");
      if (err) {
        throw(err);
      }

      if (!result || result.error) {
        console.log(!result ? 'error occurred' : result.error);
      }

      // if publish_actions permission is missing - go to login dialog
      if (!result.data[0] || !result.data[0].publish_actions || result.data[0].publish_actions == 0) {
        //console.log("publish_actions: " + result.data[0].publish_actions);
        req.session = null; // clear session
        return res.redirect('/mobile');
      }

      mongodbprovider.save(user, "users", function(error) {
        if (error) {
          console.log(error);

          throw(err);
        }
      });

      mongodbprovider.findOne( { "fb.id": user.fb.id }, "users", this);
    },
    function getProfileInformationOrRenderView(error, document) {
      console.log("getProfileInformationOrRenderView");
      if (error) {
        console.log(error);
        throw(error);
      } else {
        if (document == null) {
          // no entry
          console.log("no doc found");
          return;
        } else if (document.profile == null) {

          // no profile
          //console.log("redirecting " + userInfo.id + " to get profile information");

          res.render('createprofile', {
            title: 'bang.on',
            user_first_name: user.fb.first_name,
            user_last_name: user.fb.last_name,
            appID: config.facebook.appId,
            uid: user.fb.id
          });

        } else {
          res.render('signedup', {
            title: 'bang.on',
            user_first_name: user.fb.first_name,
            user_last_name: user.fb.last_name,
            appID: config.facebook.appId,
            uid: user.fb.id
          });

          tracking.logReturningUser(user.fb.id, function(error) {
            if (error) {
              throw(error);
            }
          });
        }
      }
    }
  );
};


exports.createProfile = function (req, res) {
  Step(
    function getUserDocument() {
      mongodbprovider.find( { "fb.id": req.body.id }, "users", this);
    },
    function insertDataIntoUserDocument(err, result) {
      if (err) {
        throw(err);
      }

      var formData = req.body;
      var id = formData["id"];
      delete formData["id"];

      mongodbprovider.update( { "fb.id": id }, "users", { $set: { profile: formData } }, null, this);
    },
    function profileCreated(err) {
      if (err) {
        throw (err);
      }

      res.send('<script>window.top.location="https://apps.facebook.com/bang-on?newSignup=1"</script>');

      res.end();
    }
  );
};


exports.opengraph = function (req, res) {
  //console.log(req);
  return res.redirect('https://apps.facebook.com/bang-on');
};

exports.logout = function (req, res) {
  req.session = null; // clear session
  res.redirect('/');
};

exports.tos = function (req, res) {
  res.render('tos');
};

exports.invitefriendsCallback = function (req, res) {
  var uid = req.body.uid;
  var request_ids = req.body.request_ids;
  //internalLog("UID: " + uid);
  //internalLog("REQUEST_IDS: " + request_ids);

  res.end();
};

exports.dashboard = function(req, res) {
  var numUsers;
  var numVisits;

  Step(
    function getAllUsers() {
      mongodbprovider.getCollectionCount("users", this);
    },
    function findSiteVisits(error, count) {
      if (error) {
        console.log(error);
        throw(error);
      } else {
        numUsers = count;

        //console.log(numUsers);
      }

      mongodbprovider.getCollectionCount("sitevisits", this);
    },
    function showDashboard(error, count) {
      if (error) {
        console.log(error);
        throw(error);
      } else {
        numVisits = count;
        //console.log(numVisits);
      }

      res.render('dashboard', {
        title: 'bang.on',
        numUsersSignedUp: numUsers,
        numSiteVisits: numVisits
      });
    }
  );
};


exports.dashboardDetailUsers = function(req, res) {
  mongodbprovider.getCollection("users", function(error, collection) {
    if (error) {
      console.log(error);
      throw(error);
    } else {
      res.writeHead(200, {'Content-type' : 'text/html'});
      res.write('<h2>Registered Users</h2>');
      //var cursor = collection.find();
      var stream = collection.find().stream();

      stream.on('data', function(doc) {
        var fbid = doc.fb.id.toString();
        res.write('<div><span><a href="/dashboard/detail/users/' + fbid + '"><img style="vertical-align:middle" src="http://graph.facebook.com/' + fbid + '/picture?type=large"></img></a></span><span>' + doc.fb.name + '</span></div><br>');
      });
      stream.on('end', function() {
        res.end();
      });
    }
  });
};


exports.dashboardDetailUsersSpecific = function(req, res) {

  Step(
    function getAllUsers() {
      mongodbprovider.find( { "fb.id": req.params.fbid }, "users", this);
    },
    function showUserDetail(error, result) {
      if (error) {
        console.log(error);
        throw(error);
      } else {
        res.writeHead(200, {'Content-type' : 'text/html'});
        res.write('<img src="http://graph.facebook.com/' + req.params.fbid + '/picture?type=large"></img><br>');
        res.write(JSON.stringify(result, null, 2));
        res.end();
      }
    }
  );
};


exports.dashboardDetailVisits = function(req, res) {

  mongodbprovider.getCollection("sitevisits", function(error, collection) {
    if (error) {
      console.log(error);
      throw(error);
    } else {
      res.writeHead(200, {'Content-type' : 'text/html'});

      //var cursor = collection.find();
      var stream = collection.find().stream();

      stream.on('data', function(doc) {
        var fbid = doc.fbid.toString();
        res.write('<div><span>' +doc._id.getTimestamp().toISOString() + ' : ' + '<a href="/dashboard/detail/users/' + fbid + '">' + fbid + '</span><span><img style="vertical-align:middle" src="http://graph.facebook.com/' + fbid + '/picture?type=small"></img></a></span></div><br>');
      });
      stream.on('end', function() {
        res.end();
      });
    }
  });
};


//function internalLog(data) {
//  if (verbose) {
//    console.log(data);
//  }
//}
