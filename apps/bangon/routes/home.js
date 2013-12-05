
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
    Step(
      function getUserDataFromGraphAPI() {
        FB.napi('/me', 'get', { access_token: accessToken }, this);
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
  //console.log("indexGet");
  res.render('index', {
    title: 'bang.on'
    });
};

exports.loginCallback = function (req, res, next) {
  //console.log('loginCallback');
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
      FB.napi('fql', { q: 'SELECT publish_actions FROM permissions WHERE uid=' + result.id, access_token: req.session.access_token }, this);
    },
    function saveNewUser(err, result) {
      if (err) {
        throw(err);
      }

      if (!result || result.error) {
        console.log(!result ? 'error occurred' : result.error);
      }

      // if publish_actions permission is missing - go to login dialog
      if (!result.data[0] || !result.data[0].publish_actions || result.data[0].publish_actions == 0) {
        console.log("publish_actions: " + result.data[0].publish_actions);
        req.session = null; // clear session
        return res.redirect('/');
      }

      mongodbprovider.save(user, "users", function(error) {
        if (error) {
          console.log(error);

          throw(err);
        }
      });

      return res.redirect('https://apps.facebook.com/bang-on');
    }
    /*function getUserFriends(result) {
      //console.log("getUserFriends");
      //console.log("result: " + JSON.stringify(result));
      if (!result || result.error) {
        //console.log(!result ? 'error occurred' : result.error);
      }

      // if publish_actions permission is missing - go to login dialog
      if (!result.data[0] || !result.data[0].publish_actions || result.data[0].publish_actions == 0) {
        //console.log("publish_actions: " + result.data[0].publish_actions);
        req.session = null; // clear session
        return res.redirect('/');
      }

      var parameters = {
        access_token: req.session.access_token
      };

      FB.napi('/me/friends', 'get', parameters, this);
    },
    function getUserLikes(err, result) {
      //console.log("getUserLikes");
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
      //console.log("saveNewUser");
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

      // trigger open graph
      var parameters = {
        access_token: req.session.access_token,
        helper_group: 'https://bangon.herokuapp.com/og/helpers.html'
      };

      FB.api('/me/' + config.facebook.appNamespace +':join', 'post', parameters , function (resultFromOG) {
        if(!resultFromOG || resultFromOG.error) {
          return res.send(500, resultFromOG || 'error');
        }
      });

      return res.redirect('https://apps.facebook.com/bang-on');
    }*/
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
  mongodbprovider.findAll("users", function(error, results) {
    if (error) {
      console.log(error);
      res.end();
    } else {
      numUsers = results.length;
    }
  });

  var numVisits;
  mongodbprovider.findAll("sitevisits", function(error, results) {
    if (error) {
      console.log(error);
      res.end();
    } else {
      numVisits = results.length;
    }
  });

  res.render('dashboard', {
    title: 'bang.on',
    numUsersSignedUp: numUsers,
    numSiteVisits: numVisits
  });
};


//function internalLog(data) {
//  if (verbose) {
//    console.log(data);
//  }
//}
