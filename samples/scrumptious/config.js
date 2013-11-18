
var config = { };

// should end in /
config.rootUrl  = process.env.ROOT_URL                  || 'http://localhost:3000/';

config.facebook = {
    appId:          process.env.FACEBOOK_APPID          || '719182394777999',
    appSecret:      process.env.FACEBOOK_APPSECRET      || '16d4c00cb0bfdaa335b043d333a40f08',
    appNamespace:   process.env.FACEBOOK_APPNAMESPACE   || 'bang-on',
    redirectUri:    process.env.FACEBOOK_REDIRECTURI    ||  config.rootUrl + 'login/callback'
};

module.exports = config;
