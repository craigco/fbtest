
var express       = require('express'),
    FB            = require('../../fb'),
    http          = require('http'),
    path          = require('path'),
    fs            = require('fs'),

    config        = require('./config'),

    api           = require('./routes/api'),
    home          = require('./routes/home'),
    meals         = require('./routes/meals'),

    http          = require('http'),
    https         = require('https');

var app = express();

if(!config.facebook.appId || !config.facebook.appSecret) {
    throw new Error('facebook appId and appSecret required in config.js');
}

var privateKey  = fs.readFileSync('cert/server.key', 'utf8');
var certificate = fs.readFileSync('cert/server.crt', 'utf8');

app.configure(function() {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.cookieParser());
    app.use(express.cookieSession({ secret: 'secret'}));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

app.get( '/',                home.index);
app.post('/',		     home.index);

app.get( '/login/callback',  home.loginCallback);
app.get( '/logout',          home.logout);
app.get( '/search',          api.search);
app.get( '/friends',         api.friends);
app.post('/announce',        api.announce);
app.get( '/meals/:id',       meals.show);
app.get( '/winjs/meals/:id', meals.showWinJs); // this is used for facebook-winjs-sdk sample and not required to actually run this sample


/**
* Start Server
*/

var credentials = {key: privateKey, cert: certificate};

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(app.get('port'), function() {
    console.log('http Listening on ' + app.get('port'))
});

httpsServer.listen(3443, function() {
    console.log('https Listening on ' + 3443)
});
