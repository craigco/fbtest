
var FB              = require('../../../fb'),
    Step            = require('step'),

    config          = require('../config');

FB.options({
    appId:          config.facebook.appId,
    appSecret:      config.facebook.appSecret,
    redirectUri:    config.facebook.redirectUri
});

exports.index = function(req, res) {
    var accessToken = req.session.access_token;

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

                res.render('signup', {
                    title:                  'bang.on',
                    loginUrl:                FB.getLoginUrl({ scope: config.facebook.scope }),
                    fb_scope:                config.facebook.scope,
                    user_first_name:         result.first_name,
                    user_last_name:          result.last_name,
                    user_profile_url_large:  'http://graph.facebook.com/'+result.id+'picture?type=large',
                    user_profile_url_medium: 'http://graph.facebook.com/'+result.id+'picture?type=medium',
                    user_profile_url_small:  'http://graph.facebook.com/'+result.id+'picture?type=small'
                });
            }
        );

    }
};

exports.loginCallback = function (req, res, next) {
    var code            = req.query.code;

    if(req.query.error) {
        // user might have disallowed the app
        return res.send('login-error ' + req.query.error_description);
    } else if(!code) {
        return res.redirect('/');
    }

    Step(
        function exchangeCodeForAccessToken() {
            console.log("exchangeCodeForAccessToken");

            FB.napi('oauth/access_token', {
                client_id:      FB.options('appId'),
                client_secret:  FB.options('appSecret'),
                redirect_uri:   FB.options('redirectUri'),
                code:           code
            }, this);
        },
        function extendAccessToken(err, result) {
            console.log("extendAccessToken");
            if(err) throw(err);
            FB.napi('oauth/access_token', {
                client_id:          FB.options('appId'),
                client_secret:      FB.options('appSecret'),
                grant_type:         'fb_exchange_token',
                fb_exchange_token:  result.access_token
            }, this);
        },
        function (err, result) {
            console.log("final function");
            if(err) return next(err);

            req.session.access_token    = result.access_token;
            req.session.expires         = result.expires || 0;

            if(req.query.state) {
                var parameters              = JSON.parse(req.query.state);
                parameters.access_token     = req.session.access_token;

                console.log(parameters);

                FB.api('/me/' + config.facebook.appNamespace +':eat', 'post', parameters , function (result) {
                    console.log(result);
                    if(!result || result.error) {
                        return res.send(500, result || 'error');
                        // return res.send(500, 'error');
                    }

                    return res.redirect('/');
                });
            } else {
                return res.redirect('/');
            }
        }
    );
};

exports.logout = function (req, res) {
    req.session = null; // clear session
    res.redirect('/');
};
