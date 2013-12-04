
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
  var signedRequest = FB.parseSignedRequest(req.body.signed_request, config.facebook.appSecret);

  var accessToken;

  if (signedRequest) {
    if (!signedRequest.oauth_token) {
      // uninstalled user
      // log given user information

      tracking.logNewUser(signedRequest.user, function () {
      });

      res.send("<script>window.top.location='" + FB.getLoginUrl({ scope: config.facebook.scope }) + "'</script>");

    } else {
      // this user has installed the app
      accessToken = signedRequest.oauth_token;

      // check if publish_actions is granted
      FB.setAccessToken(accessToken);

      FB.api('fql', { q: 'SELECT publish_actions FROM permissions WHERE uid=' + signedRequest.user_id }, function(queryResponse) {
        if (!queryResponse || queryResponse.error) {
          console.log(!queryResponse ? 'error occurred' : queryResponse.error);
        }

        // if publish_actions permission is missing - go to login dialog
        if (!queryResponse.data.publish_actions || queryResponse.data.publish_actions == 0) {
          res.send("<script>window.top.location='" + FB.getLoginUrl({ scope: config.facebook.scope }) + "'</script>");

          res.end();
        }
      });
    }
  } else {
    accessToken = req.session.access_token;
  }

  if (!accessToken) {
    console.log("!accessToken");
    res.render('index', {
      title: 'bang.on'
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
        if (err) throw(err);

        res.render('signedup', {
          title: 'bang.on',
          user_first_name: result.first_name,
          user_last_name: result.last_name,
          appID: config.facebook.appId,
          uid: result.id
        });

        tracking.logReturningUser(result.id, function(error) {
         if (error) {
           throw(error);
         }
        });
      }
    );
  }
};

exports.indexGet = function (req, res) {
  console.log("indexGet");
  res.render('index', {
    title: 'bang.on'
    });
};

exports.loginCallback = function (req, res, next) {
  console.log('loginCallback');
  var code            = req.query.code;

  if (req.query.error) {
    // user might have disallowed the app

    tracking.logNoPermissions(function(error) {
      if (error) {
        console.log("error: " + error);
        throw(error);
      }
    });

    req.session = null;
    return res.redirect('/');

  } else if(!code) {
      return res.redirect('/');
  }

  var user;

  Step(
    function exchangeCodeForAccessToken() {
      console.log("exchangeCodeForAccessToken");
      FB.napi('oauth/access_token', {
        client_id: FB.options('appId'),
        client_secret: FB.options('appSecret'),
        redirect_uri: FB.options('redirectUri'),
        code: code
      }, this);
    },
    function extendAccessToken(err, result) {
      console.log("extendAccessToken");
      if (err) throw(err);
      FB.napi('oauth/access_token', {
        client_id: FB.options('appId'),
        client_secret: FB.options('appSecret'),
        grant_type: 'fb_exchange_token',
        fb_exchange_token: result.access_token
      }, this);
    },
    function getUserData(err, result) {
      console.log("getUserData");
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
      FB.setAccessToken(req.session.access_token);

      FB.api('fql', { q: 'SELECT publish_actions FROM permissions WHERE uid=' + result.id }, this);
    },
    function getUserFriends(result) {
      console.log("getUserFriends");

      if (!result || result.error) {
        console.log(!result ? 'error occurred' : result.error);
      }

      // if publish_actions permission is missing - go to login dialog
      if (!result.data.publish_actions || result.data.publish_actions == 0) {
        return res.redirect('/');
      }

      var parameters = {
        access_token: req.session.access_token
      };

      FB.napi('/me/friends', 'get', parameters, this);
    },
    function getUserLikes(err, result) {
      console.log("getUserLikes");
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
      console.log("saveNewUser");
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

      return res.redirect('https://apps.facebook.com/bang-on');
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

exports.invitefriendsCallback = function (req, res) {
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
