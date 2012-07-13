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
  
  app.get('/seeclickfix', function(req, res){
    res.render('seeclickfix');
  });
  app.get('/surveyed', function(req, res){
    // http://nickd.iriscouch.com:5984/housing/_design/poll1/_view/Poll1?key="ADDRESS, Macon, GA"
    var street = req.query["address"];
    var sendurl = 'http://nickd.iriscouch.com:5984/housing/_design/poll1/_view/Poll1?key=' + encodeURIComponent( '"' + street + '"');
    res.send(sendurl);
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
  });
  app.get('/surveystreet', function(req, res){
    // http://nickd.iriscouch.com:5984/housing/_design/streetname/_view/streetname?startkey="adamsave"&endkey="adamsave0"
    var street = req.query["streetname"];
    street = street.toLowerCase();
    street = street.replace("street","st");
    street = street.replace("avenue","ave");
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
  app.get('/keydb', function(req, res){
    var street = req.query["address"];
    var sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/poll1/_view/Poll1?key=' + encodeURIComponent( '"' + street + '"');
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
  });
  
  app.get('/searchdb', function(req, res){
    // http://nickd.iriscouch.com:5984/cases/_design/streetname/_view/streetname?startkey="adamsave"&endkey="adamsave0"
    var street = req.query["streetname"];
    street = street.toLowerCase();
    street = street.replace("street","st");
    street = street.replace("avenue","ave");
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

    var sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/streetname/_view/streetname?startkey=' + encodeURIComponent( '"' + street + '"') + '&endkey=' + encodeURIComponent( '"' + street + '0"' );

    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
  });
  
  app.get('/recentopen', function(req, res){
    var sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/opendate/_view/opendate?descending=true&limit=5';
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
  });
  app.get('/recentclose', function(req, res){
    var sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/closedate/_view/closedate?descending=true&limit=5';
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
  });
  
  app.get('/311/services.json', function(req, res){
    res.send([{
      "service_code": 1,
      "service_name":"Undetermined",
      "description":"Case is open, will be reviewed by an inspector from Macon ECD.",
      "metadata":true,
      "type":"realtime",
      "keywords":"undetermined, open",
      "group":"ecd"
    },
    {
      "service_code": 2,
      "service_name":"Fixed",
      "description":"Case was reviewed and closed by an inspector from Macon ECD.",
      "metadata":true,
      "type":"realtime",
      "keywords":"fixed, closed",
      "group":"ecd"
    }]);
  });
  
  /*app.get('/311/services/*.json', function(req, res){
    var service_code = req.url.substring( req.url.indexOf("/services/") + 10, req.url.indexOf(".") );
    var service_name = "";
    if(service_code == 1){
      service_name = "open";
    }
    else if(service_code == 2){
      service_name = "closed";
    }
    var sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/opendate/_view/opendate?descending=true&limit=70';
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      var outobjs = [ ];
      var tstamp = function(t){
        return t.substring(0,4) + "-" + t.substring(4,6) + "-" + t.substring(6,8) + "T12:00:00-04:00";
      };
      body = JSON.parse(body);
      for(var r=0;r<body.rows.length;r++){
        if(outobjs.length >= 30){
          break;
        }
        // straightforward mapping of values to Open311 API
        var threeobj = {
          "service_request_id": body.rows[r].value._id,
          "status_notes": null,
          "agency_responsible": "Macon ECD",
          "service_notice": null,
          "address": body.rows[r].value.address.replace(',',' '),
          "address_id": body.rows[r].value.address,
          "lat": body.rows[r].value.loc[0],
          "long": body.rows[r].value.loc[1]
        };
        
        // calculate and format additional values for Open311 API output
        threeobj["requested_datetime"] = tstamp( body.rows[r].value.opendate );
        if(body.rows[r].value.closedate.length == 8){
          if(service_name == "open"){
            continue;
          }
          threeobj["status"] = "closed";
          threeobj["service_name"] = body.rows[r].value.action;
          threeobj["description"] = "Case closed with " + body.rows[r].value.action + " by " + body.rows[r].value.inspector;
          threeobj["updated_datetime"] = tstamp( body.rows[r].value.closedate );
          // service_code
          // expected_datetime          
        }
        else{
          if(service_name == "closed"){
            continue;
          }
          threeobj["status"] = "open";
          threeobj["service_name"] = "Undetermined";
          threeobj["description"] = "Case opened by " + body.rows[r].value.reason;
          threeobj["updated_datetime"] = tstamp( body.rows[r].value.opendate );
          // service_code
          // expected_datetime
        }
        outobjs.push( threeobj );
        
      }
      res.send(outobjs);
    });
  });*/
  
  app.get('/311/requests/*.json', function(req, res){
    var service_id = req.url.substring( req.url.indexOf("/requests/") + 10, req.url.indexOf(".") );
    var sendurl = 'http://nickd.iriscouch.com:5984/cases/' + id;
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      var tstamp = function(t){
        return t.substring(0,4) + "-" + t.substring(4,6) + "-" + t.substring(6,8) + "T12:00:00-04:00";
      };
      body = JSON.parse(body);
      // straightforward mapping of values to Open311 API
      var threeobj = {
        "service_request_id": body._id,
        "status_notes": null,
        "agency_responsible": "Macon ECD",
        "service_notice": null,
        "address": body.address.replace(',',' '),
        "address_id": body.address,
        "lat": body.loc[0],
        "long": body.loc[1]
      };
        
      // calculate and format additional values for Open311 API output
      threeobj["requested_datetime"] = tstamp( body.opendate );
      if(body.closedate.length == 8){
        threeobj["status"] = "closed";
        threeobj["service_name"] = body.action;
        threeobj["description"] = "Case closed with " + body.action + " by " + body.inspector;
        threeobj["updated_datetime"] = tstamp( body.closedate );
        // service_code
        // expected_datetime          
      }
      else{
        threeobj["status"] = "open";
        threeobj["service_name"] = "Undetermined";
        threeobj["description"] = "Case opened by " + body.reason;
        threeobj["updated_datetime"] = tstamp( body.opendate );
        // service_code
        // expected_datetime
      }
      res.send(threeobj);
    });
  });

  app.get('/311/requests.json', function(req, res){
    var sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/opendate/_view/opendate?descending=true&limit=30';
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      var outobjs = [ ];
      var tstamp = function(t){
        return t.substring(0,4) + "-" + t.substring(4,6) + "-" + t.substring(6,8) + "T12:00:00-04:00";
      };
      body = JSON.parse(body);
      for(var r=0;r<body.rows.length;r++){
        // straightforward mapping of values to Open311 API
        var threeobj = {
          "service_request_id": body.rows[r].value._id,
          "status_notes": null,
          "agency_responsible": "Macon ECD",
          "service_notice": null,
          "address": body.rows[r].value.address.replace(',',' '),
          "address_id": body.rows[r].value.address,
          "lat": body.rows[r].value.loc[0],
          "long": body.rows[r].value.loc[1]
        };
        
        // calculate and format additional values for Open311 API output
        threeobj["requested_datetime"] = tstamp( body.rows[r].value.opendate );
        if(body.rows[r].value.closedate.length == 8){
          threeobj["status"] = "closed";
          threeobj["service_name"] = body.rows[r].value.action;
          threeobj["description"] = "Case closed with " + body.rows[r].value.action + " by " + body.rows[r].value.inspector;
          threeobj["updated_datetime"] = tstamp( body.rows[r].value.closedate );
          // service_code
          // expected_datetime          
        }
        else{
          threeobj["status"] = "open";
          threeobj["service_name"] = "Undetermined";
          threeobj["description"] = "Case opened by " + body.rows[r].value.reason;
          threeobj["updated_datetime"] = tstamp( body.rows[r].value.opendate );
          // service_code
          // expected_datetime
        }
        outobjs.push( threeobj );
        
      }
      res.send(outobjs);
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