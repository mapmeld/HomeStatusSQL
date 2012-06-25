/*jshint laxcomma:true */

/**
 * Module dependencies.
 */
var auth = require('./auth')
    , express = require('express')
    , mongoose = require('mongoose')
    , mongoose_auth = require('mongoose-auth')
    , mongoStore = require('connect-mongo')(express)
    , routes = require('./routes')
    , middleware = require('./middleware')
    , http = require('http')
    , url = require('url')
    ;

var HOUR_IN_MILLISECONDS = 3600000;
var session_store;

var init = exports.init = function (config) {
  
  var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;

  mongoose.connect(db_uri);
  session_store = new mongoStore({url: db_uri});

  var app = express.createServer();

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { pretty: true });

    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.session({secret: 'top secret', store: session_store,
      cookie: {maxAge: HOUR_IN_MILLISECONDS}}));
    app.use(mongoose_auth.middleware());
    app.use(express.static(__dirname + '/public'));
    app.use(app.router);

  });

  app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('production', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: false}));
  });
  

var urlReq = function(reqUrl, options, cb){
    if(typeof options === "function"){ cb = options; options = {}; }// incase no options passed in

    // parse url to chunks
    reqUrl = url.parse(reqUrl);

    // http.request settings
    var settings = {
        host: reqUrl.hostname,
        port: reqUrl.port || 80,
        path: reqUrl.pathname,
        headers: options.headers || {},
        method: options.method || 'GET'
    };

    // if there are params:
    if(options.params){
        options.params = JSON.stringify(options.params);
        settings.headers['Content-Type'] = 'application/json';
        settings.headers['Content-Length'] = options.params.length;
    };

    // MAKE THE REQUEST
    var req = http.request(settings);

    // if there are params: write them to the request
    if(options.params){ req.write(options.params) };

    // when the response comes back
    req.on('response', function(res){
        res.body = '';
        res.setEncoding('utf-8');

        // concat chunks
        res.on('data', function(chunk){ res.body += chunk });

        // when the response has finished
        res.on('end', function(){
            
            // fire callback
            cb(res.body, res);
        });
    });

    // end the request
    req.end();
}
  
  // Routes
  app.get('/sendstuff', function(req,res){
    urlReq("http://nickd.iriscouch.com:5984/housing", {
      method: 'POST',
      params: {
        "_id":"house_1",
        "sample":true
      }
    }, function(body, info){
      res.send( body );
    });
  });

  app.get('/auth', middleware.require_auth_browser, routes.index);
  app.post('/auth/add_comment',middleware.require_auth_browser, routes.add_comment);
  
  // redirect all non-existent URLs to doesnotexist
  app.get('*', function onNonexistentURL(req,res) {
    res.render('doesnotexist',404);
  });

  mongoose_auth.helpExpress(app);

  return app;
};

// Don't run if require()'d
if (!module.parent) {
  var config = require('./config');
  var app = init(config);
  app.listen(process.env.PORT || 3000);
  console.info("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}