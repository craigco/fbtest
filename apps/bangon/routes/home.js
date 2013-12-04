
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

exports.index = function(req, res) {

    //console.log(req);

    var signedRequest  = FB.parseSignedRequest(req.body.signed_request, config.facebook.appSecret);

    var accessToken;

    if (signedRequest) {
        internalLog(signedRequest);

        if (!signedRequest.oauth_token) {
            internalLog("no auth token in signed request");
            // uninstalled user

            // log given user information

            tracking.logNewUser(signedRequest.user, function() {

            });

            res.send("<script>window.top.location='" + FB.getLoginUrl({ scope: config.facebook.scope }) + "'</script>");

        } else {
            // this user has installed the app
            accessToken = signedRequest.oauth_token;
            var userId = signedRequest.user_id;
            var userCountry = signedRequest.user.country;
        }
    } else {
        accessToken = req.session.access_token;
    }

    if (!accessToken) {
        res.render('index', {
            title: 'bang.on',
            loginUrl: FB.getLoginUrl({ scope: config.facebook.scope }),
            fb_scope: config.facebook.scope
        });
    } else {
        Step(
            function getUserDataFromGraphAPI() {
                var parameters = {
                    access_token: accessToken
                };

                FB.napi('/me', 'get', parameters, this);
            },
            function renderView(err, result) {
                if(err) throw(err);

                console.log(JSON.stringify(result));

                res.render('signedup', {
                    title:                   'bang.on',
                    user_first_name:          result.first_name,
                    user_last_name:           result.last_name,
                    appID:                    config.facebook.appId,
                    uid:                      result.id
                });

                tracking.logReturningUser(result.id);
            }
        );

    }
};

exports.loginCallback = function (req, res, next) {
  var code            = req.query.code;

  if (req.query.error) {
      // user might have disallowed the app
      return res.send('login-error ' + req.query.error_description);
  } else if(!code) {
      return res.redirect('/');
  }

  var accessToken;
  var user;
  Step(
    function exchangeCodeForAccessToken() {

      FB.napi('oauth/access_token', {
        client_id: FB.options('appId'),
        client_secret: FB.options('appSecret'),
        redirect_uri: FB.options('redirectUri'),
        code: code
      }, this);
    },
    function extendAccessToken(err, result) {

      if (err) throw(err);
      FB.napi('oauth/access_token', {
        client_id: FB.options('appId'),
        client_secret: FB.options('appSecret'),
        grant_type: 'fb_exchange_token',
        fb_exchange_token: result.access_token
      }, this);
    },
    function getUserData(err, result) {
      if (err) {
        throw(err);
      }

      req.session.access_token = result.access_token;
      req.session.expires = result.expires || 0;

      var parameters = {
        access_token: result.access_token
      };

      FB.napi('/me', 'get', parameters, this);
    },
    function getUserFriends(err, result) {
      if (err) {
        throw(err);
      }

      // wrap in facebook node
      user = {
        fb: result
      };

      var parameters = {
        access_token: req.session.access_token
      };

      FB.napi('/me/friends', 'get', parameters, this);
    },
    function getUserLikes(err, result) {
      if (err) {
        throw(err);
      }

      user.fb.friends = result;

      var parameters = {
        access_token: req.session.access_token
      };

      FB.napi('/me/likes', 'get', parameters, this);
    },
    function saveNewUser(err, result) {
      if (err) {
        throw(err);
      }

      user.fb.likes = result;

      mongodbprovider.save(user, "users", function(error) {
        if (error) {
          console.log(error);

          throw(err);
        }
      });

      return res.redirect('/');
    }
  );
};

exports.logout = function (req, res) {
    req.session = null; // clear session
    res.redirect('/');
};

exports.tos = function (req, res) {
    res.render('tos');
};

exports.invitefriendsCallback = function(req, res) {
  var uid = req.body.uid;
  var request_ids = req.body.request_ids;
  internalLog("UID: " + uid);
  internalLog("REQUEST_IDS: " + request_ids);

  res.end();
};


function internalLog(data) {
    if (verbose) {
        console.log(data);
    }
}
