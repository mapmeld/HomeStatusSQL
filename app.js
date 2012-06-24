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
    , querystring = require('querystring')
    , http = require('http')
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
  
  
  // Routes
  app.get('/sendstuff', function(req,res){
    var post_data = querystring.stringify({
      "docs": [ {"_id":"house_1", "sample":true}
         , {"_id":"house_2", "sample":true}
         , {"_id":"house_3", "sample":true}
         ]
    });
    var post_options = {
      host: 'https://nickd.iriscouch.com:6984',
      port: '6984',
      path: '/housing',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
      }
    };
    
    var post_req = http.request(post_options, function(res){
      res.setEncoding('utf8');
      res.on('data', function(chunk){
        console.log('Response: ' + chunk);
      });
    });
    
    post_req.write(post_data);
    post_req.end();
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