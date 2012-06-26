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
    , request = require('request')
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
  app.get('/', function(req, res){
    res.redirect('/statushome.html');
  });
  
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
  
  app.get('/keydb', function(req, res){
    // http://nickd.iriscouch.com:5984/housing/_design/poll1/_view/Poll1?key="ADDRESS, Macon, GA"
    
    var street = req.query["address"];

    var sendurl = 'http://nickd.iriscouch.com:5984/housing/_design/poll1/_view/Poll1?key=' + encodeURIComponent( '"' + street + '"');

    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
    
  });
  
  app.get('/searchdb', function(req, res){
    //houseobj = [{"address_id":85102959,"address_long":"2113 perdido street","case_district":null,"created_at":"2012-04-17T19:06:43Z","geopin":41030850,"house_num":"2113","id":89391,"official":true,"parcel_id":"104104907-0000","point":"POINT (-90.08607222086655 29.956817832319636)","status":"ACTIVE","street_full_name":null,"street_id":null,"street_name":"PERDIDO","street_type":"ST","updated_at":"2012-04-17T19:06:43Z","x":3675794.39123,"y":531938.286072,"most_recent_status_preview":{"type":"Hearing","date":"April  4, 2012"}},{"address_id":85102958,"address_long":"2117 perdido street","case_district":null,"created_at":"2012-04-17T19:06:43Z","geopin":41030851,"house_num":"2117","id":89390,"official":true,"parcel_id":"104104906-0000","point":"POINT (-90.08615780435524 29.956855768116412)","status":"ACTIVE","street_full_name":null,"street_id":null,"street_name":"PERDIDO","street_type":"ST","updated_at":"2012-04-17T19:06:43Z","x":3675767.14106,"y":531951.785976,"most_recent_status_preview":{"type":"Hearing","date":"March  7, 2012"}},{"address_id":85102956,"address_long":"2121 perdido street","case_district":null,"created_at":"2012-04-17T19:06:43Z","geopin":41030852,"house_num":"2121","id":89388,"official":true,"parcel_id":"104104905-0000","point":"POINT (-90.08624146971519 29.956889217404825)","status":"ACTIVE","street_full_name":null,"street_id":null,"street_name":"PERDIDO","street_type":"ST","updated_at":"2012-04-17T19:06:43Z","x":3675740.51603,"y":531963.661048,"most_recent_status_preview":{"type":"Inspection","date":"January 23, 2012"}},{"address_id":85105330,"address_long":"2125 perdido street","case_district":null,"created_at":"2012-04-17T19:06:51Z","geopin":41030853,"house_num":"2125","id":91331,"official":true,"parcel_id":"104104904-0000","point":"POINT (-90.08631996066069 29.956926054519645)","status":"ACTIVE","street_full_name":null,"street_id":null,"street_name":"PERDIDO","street_type":"ST","updated_at":"2012-04-17T19:06:51Z","x":3675715.5161,"y":531976.785912,"most_recent_status_preview":{"type":"Hearing","date":"March  7, 2012"}},{"address_id":85104701,"address_long":"3023 perdido street","case_district":null,"created_at":"2012-04-17T19:06:49Z","geopin":41036764,"house_num":"3023","id":90764,"official":true,"parcel_id":"104106508-0000","point":"POINT (-90.09672890100006 29.96178550298456)","status":"ACTIVE","street_full_name":null,"street_id":null,"street_name":"PERDIDO","street_type":"ST","updated_at":"2012-04-17T19:06:49Z","x":3672400.45459,"y":533708.145914,"most_recent_status_preview":{"type":"Inspection","date":"November  3, 2011"}}];
    // http://nickd.iriscouch.com:5984/housing/_design/streetname/_view/streetname?startkey="adamsave"&endkey="adamsave0"
    var street = req.query["streetname"];
    street = street.toLowerCase();
    if(street.indexOf("-") > -1){
      street = street.substring( street.indexOf("-") + 1 );
    }
    while(street.indexOf(" ") > -1){
      street = street.replace(" ","");
    }
    for(var c=0;c<street.length;c++){
      if(isNaN(1*street[c])){
        street = street.substring(c);
        break;
      }
    }

    var sendurl = 'http://nickd.iriscouch.com:5984/housing/_design/streetname/_view/streetname?startkey=' + encodeURIComponent( '"' + street + '"') + '&endkey=' + encodeURIComponent( '"' + street + '0"' );

    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
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