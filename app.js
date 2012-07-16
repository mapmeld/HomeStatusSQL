/*jshint laxcomma:true */

/**
 * Module dependencies.
 */
 
// Poang framework
var auth = require('./auth')
    , express = require('express')
    , mongoose = require('mongoose')
    , mongoose_auth = require('mongoose-auth')
    , mongoStore = require('connect-mongo')(express)
    , routes = require('./routes')
    , middleware = require('./middleware')
    
// added http request libraries
    , http = require('http')
    , url = require('url')
    , request = require('request')
    ;

var HOUR_IN_MILLISECONDS = 3600000;
var session_store;

var init = exports.init = function (config) {
  
  // TODO: remove MongoDB storing sessions or cap collection
  // TODO: should MongoDB store EveryAuth logins?
  var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;

  mongoose.connect(db_uri);
  session_store = new mongoStore({url: db_uri});

  // Express server setup
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
  

  // url request function
  var urlReq = function(reqUrl, options, cb){
    if(typeof options === "function"){
      cb = options;
      options = {};
    }
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
    if(options.params){
      options.params = JSON.stringify(options.params);
      settings.headers['Content-Type'] = 'application/json';
      settings.headers['Content-Length'] = options.params.length;
    };

    // Make the request
    var req = http.request(settings);
    if(options.params){
      req.write(options.params);
    }

    // Handle the response
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
  
  // Sample posting to housing DB
  /* app.get('/sendstuff', function(req,res){
    urlReq("http://nickd.iriscouch.com:5984/housing", {
      method: 'POST',
      params: {
        "_id":"house_1",
        "sample":true
      }
    }, function(body, info){
      res.send( body );
    });
  }); */
  
  // Code Enforcement Case History URLs
  app.get('/keydb', function(req, res){
    // Request a house's code enforcement history by address
    var street = req.query["address"];
    var sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/poll1/_view/Poll1?key=' + encodeURIComponent( '"' + street + '"');
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
  });
  
  app.get('/searchdb*', function(req, res){
    // Request code enforcement history by street
    // Sample URL: http://nickd.iriscouch.com:5984/cases/_design/streetname/_view/streetname?startkey="adamsave"&endkey="adamsave0"
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
    request(requestOptions, function(err, response, body){
      if(req.query["fmt"] == "kml"){
        // KML API for mapping mash-ups
        res.setHeader('Content-Type', 'application/kml');
        var totalrep = JSON.parse(body);
        var kmlintro = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n<Document>\n	<name>Macon Housing API</name>\n	<Style id="BasicStyle">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://maps.google.com/mapfiles/kml/paddle/red-blank_maps.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n	<Folder id="KMLAPI">\n		<name>KML API Download</name>\n		<Style id="BasicStyle">\n			<IconStyle>\n				<color>ffffffff</color>\n				<scale>1.1</scale>\n				<Icon>\n					<href>http://maps.google.com/mapfiles/kml/paddle/red-blank_maps.png</href>\n				</Icon>\n				<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n			</IconStyle>\n			<BalloonStyle>\n				<text>$[description]</text>\n				<textColor>ff000000</textColor>\n				<displayMode>default</displayMode>\n</BalloonStyle>\n</Style>\n';
		// Placemarks
		var kmlplacemarks = '';
		for(var pt=0;pt<totalrep.rows.length;pt++){
		  kmlplacemarks += '		<Placemark>\n			<name>' + totalrep.rows[pt].value.address + '</name>\n			<address>' + totalrep.rows[pt].value.address + '</address>\n';
		  kmlplacemarks += '			<description><![CDATA[<div class="googft-info-window" style="font-family:sans-serif"><b>Address:</b>' + totalrep.rows[pt].value.address + '<br><b>Case ID:</b> ' + totalrep.rows[pt].value.ecd_id + '<br><b>Opened:</b> ' + totalrep.rows[pt].value.opendate + '<br><b>Closed:</b> ' + totalrep.rows[pt].value.closedate + '<br><b>Inspector:</b> ' + totalrep.rows[pt].value.inspector + '<br><b>Cause:</b> ' + totalrep.rows[pt].value.reason + '<br><b>Neighborhood:</b> ' + (totalrep.rows[pt].value.neighborhood || '') + '<br></div>]]></description>\n';
		  kmlplacemarks += '			<styleUrl>#BasicStyle</styleUrl>\n			<ExtendedData>\n				<Data name="F">\n					<value>F</value>\n				</Data>\n			</ExtendedData>\n';
		  kmlplacemarks += '			<Point>\n				<coordinates>' + totalrep.rows[pt].value.loc[1] + ',' + totalrep.rows[pt].value.loc[0] + ',0</coordinates>\n			</Point>\n		</Placemark>\n';
		}
		var kmlend = '	</Folder>\n</Document>\n</kml>';
        res.send(kmlintro + kmlplacemarks + kmlend);
      }
      else if(req.query["fmt"] == "png"){
        // PNG API using node-canvas
        res.setHeader('Content-Type', 'image/png');
        res.send("todo");
      }
      else{
        // JSON API / main site
        res.setHeader('Content-Type', 'application/json');
        res.send(body);
      }
    });
  });
  
  // Code Enforcement's recent cases: recent opens and recent closes
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
  
  // Code Enforcement cases: look up by geo
  app.get('/osmgeo', function(req, res){
    // OSM Nominatim search
    var street = req.query["streetname"] + " Macon";
    for(var c=0;c<street.length;c++){
      if(street[c] == " "){
        continue; 
      }
      if(isNaN(1*street[c])){
        street = street.substring(c);
        break;
      }
    }
    var sendurl = 'http://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(street) + "&maxlat=33.0363&maxlon=-83.2819&minlat=32.5745&minlon=-84.10583";
    /* if(sendurl.toLowerCase().indexOf("macon") == -1){
      sendurl += ", Macon, Bibb County, GA";
    } */
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
  });
  app.get('/geo*', function(req, res){
    // GET /geo?bbox=south,west,north,east
    // http://nickd.iriscouch.com:5984/cases/_design/spatial/_view/spatial?startkey={%22type%22:%22Point%22,%22coordinates%22:[32.7,85]}&endkey={%22type%22:%22Point%22,%22coordinates%22:[32.78,84]}
    var bbox = req.query["bbox"].split(",");
    var south = bbox[0] * 1.0,
      north = bbox[2] * 1.0,
      west = bbox[1] * 1.0,
      east = bbox[3] * 1.0;

    var sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/spatial/_view/spatial?startkey={%22type%22:%22Point%22,%22coordinates%22:[' + south + ',0]}&endkey={%22type%22:%22Point%22,%22coordinates%22:[' + north + ',0]}';
    if(req.query["status"] == "open"){
      // add &status=isopen to geosearch only open cases
      sendurl = sendurl.replace("/spatial", "/isopen").replace("/spatial", "/isopen");
    }
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body){
      var totalrep = JSON.parse(body);
      // for now the query returns all points between south and north bounds
      // remaining points should be filtered out if they're outside west and east bounds
      for(var r=totalrep.rows.length-1;r>=0;r--){
        if(west > east){
          // int'l date line fix
          if(totalrep.rows[r].key.coordinates[1] > west && totalrep.rows[r].key.coordinates[1] < east){
            totalrep.rows.splice(r,1);
          }
        }
        else{
          if(totalrep.rows[r].key.coordinates[1] < west || totalrep.rows[r].key.coordinates[1] > east){
            totalrep.rows.splice(r,1);
          }
        }
      }
      if(req.query["fmt"] == "kml"){
        // KML API for mapping mash-ups
        res.setHeader('Content-Type', 'application/kml');
        var body = JSON.parse(body);
        var kmlintro = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n<Document>\n	<name>Macon Housing API</name>\n	<Style id="BasicStyle">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://maps.google.com/mapfiles/kml/paddle/red-blank_maps.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n	<Folder id="KMLAPI">\n		<name>KML API Download</name>\n		<Style id="BasicStyle">\n			<IconStyle>\n				<color>ffffffff</color>\n				<scale>1.1</scale>\n				<Icon>\n					<href>http://maps.google.com/mapfiles/kml/paddle/red-blank_maps.png</href>\n				</Icon>\n				<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n			</IconStyle>\n			<BalloonStyle>\n				<text>$[description]</text>\n				<textColor>ff000000</textColor>\n				<displayMode>default</displayMode>\n</BalloonStyle>\n</Style>\n';
		// Placemarks
		var kmlplacemarks = '';
		for(var pt=0;pt<totalrep.rows.length;pt++){
		  kmlplacemarks += '		<Placemark>\n			<name>' + totalrep.rows[pt].value.address + '</name>\n			<address>' + totalrep.rows[pt].value.address + '</address>\n';
		  kmlplacemarks += '			<description><![CDATA[<div class="googft-info-window" style="font-family:sans-serif"><b>Address:</b>' + totalrep.rows[pt].value.address + '<br><b>Case ID:</b> ' + totalrep.rows[pt].value.ecd_id + '<br><b>Opened:</b> ' + totalrep.rows[pt].value.opendate + '<br><b>Closed:</b> ' + totalrep.rows[pt].value.closedate + '<br><b>Inspector:</b> ' + totalrep.rows[pt].value.inspector + '<br><b>Cause:</b> ' + totalrep.rows[pt].value.reason + '<br><b>Neighborhood:</b> ' + (totalrep.rows[pt].value.neighborhood || '') + '<br></div>]]></description>\n';
		  kmlplacemarks += '			<styleUrl>#BasicStyle</styleUrl>\n			<ExtendedData>\n				<Data name="F">\n					<value>F</value>\n				</Data>\n			</ExtendedData>\n';
		  kmlplacemarks += '			<Point>\n				<coordinates>' + totalrep.rows[pt].value.loc[1] + ',' + totalrep.rows[pt].value.loc[0] + ',0</coordinates>\n			</Point>\n		</Placemark>\n';
		}
		var kmlend = '	</Folder>\n</Document>\n</kml>';
        res.send(kmlintro + kmlplacemarks + kmlend);
      }
      else if(req.query["fmt"] == "png"){
        // PNG API using node-canvas
        res.setHeader('Content-Type', 'image/png');
        res.send("todo");
      }
      else{
        // JSON API / main site
        res.setHeader('Content-Type', 'application/json');
        res.send(totalrep);
      }
    });
  });

  // Open311 / SeeClickFix Client (works and makes maps from city's service request system)
  app.get('/seeclickfix', function(req, res){
    // map of recent reports to look up survey and case history
    res.render('seeclickfix');
  });
  app.get('/surveyed', function(req, res){
    // Request survey data by address
    // Sample URL: http://nickd.iriscouch.com:5984/housing/_design/poll1/_view/Poll1?key="ADDRESS, Macon, GA"
    var street = req.query["address"];
    var sendurl = 'http://nickd.iriscouch.com:5984/housing/_design/poll1/_view/Poll1?key=' + encodeURIComponent( '"' + street + '"');
    //res.send(sendurl);
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.send(body);
    });
  });
  app.get('/surveystreet', function(req, res){
    // Request survey data by street
    // Sample URL: http://nickd.iriscouch.com:5984/housing/_design/streetname/_view/streetname?startkey="adamsave"&endkey="adamsave0"
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
  
  // API home - explains Open311, JSON, KML, and node-canvas APIs
  app.get('/api', function(req, res){
    res.render('apihome');
  });
  
  // Open311 Server - returns code enforcement cases in Open311's JSON format
  // TODO: add XML support
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
  
  app.get('/311/services/*.json', function(req, res){
    var service_code = req.url.substring( req.url.indexOf("/services/") + 10, req.url.indexOf(".") );
    var service_name = "";
    if(service_code == 1){
      service_name = "open";
      res.send({
        "service_code": "1",
        "service_name":"Undetermined",
        "description":"Case is open, will be reviewed by an inspector from Macon ECD.",
        "metadata":true,
        "type":"realtime",
        "keywords":"undetermined, open",
        "group":"ecd"
      });
    }
    else if(service_code == 2){
      service_name = "closed";
      res.send({
        "service_code": "2",
        "service_name":"Fixed",
        "description":"Case was reviewed and closed by an inspector from Macon ECD.",
        "metadata":true,
        "type":"realtime",
        "keywords":"fixed, closed",
        "group":"ecd"
      });
    }
  });
  
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
        // expected_datetime
        threeobj["service_code"] = "2";
      }
      else{
        threeobj["status"] = "open";
        threeobj["service_name"] = "Undetermined";
        threeobj["description"] = "Case opened by " + body.reason;
        threeobj["updated_datetime"] = tstamp( body.opendate );
        // expected_datetime
        threeobj["service_code"] = "1";
      }
      res.send(threeobj);
    });
  });

  app.get('/311/requests.json', function(req, res){
    var sendurl;
    if(req.query['service_request_id'] && req.query['service_request_id'].length){
      // this query asks for multiple service requests by their id
      // any other parameters in the URL are ignored
      var service_requests = req.query['service_request_id'].split(',');
      sendurl = 'http://nickd.iriscouch.com:5984/cases/_all_docs?include_docs=true&keys=[' + encodeURIComponent( service_requests ) + ']';
    }
    else{
      // follow Open311 API parameters
      var printDate = function(dt){
        var printmonth = dt.getMonth() * 1 + 1;
        if(printmonth < 10){
          printmonth = "0" + printmonth;
        }
        var printday = dt.getDate();
        if(printday < 10){
          printday = "0" + printday;
        }
        return encodeURIComponent('"' + dt.getFullYear() + "" + printmonth + "" + printday + '"');
      };
      var endkey; // the endkey is the start_date, the earliest date to return from the database
      if(req.query['start_date'] && req.query['start_date'].length){
        // start date specified
        endkey = new Date(req.query['start_date']);
      }
      else{
        // default: up to 90 days ago, or 1000 results, whichever returns fewer reports
        endkey = new Date();
        endkey = new Date(endkey - 90 * 24 * 60 * 60 * 1000);
      }
      var startkey = ''; // the startkey is the end_date, the latest date to return from the database
      if(req.query['end_date'] && req.query['end_date'].length){
        startkey = new Date(req.query['end_date']);
        startkey = "&startkey=" + printDate(startkey);
      }
      if((req.query['status'] && req.query['status'].length)||(req.query['service_code'] && req.query['service_code'].length)){
        if((req.query['status'] && req.query['status'] == "open")||(req.query['service_code'] && req.query['service_code'] == "1")){
          // show only the open cases
          sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/opendate/_view/opendate?descending=true&limit=1000&endkey=' + printDate(endkey) + startkey;
        }
        else{
          // show only the closed cases
          sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/closedate/_view/closedate?descending=true&limit=1000&endkey=' + printDate(endkey) + startkey;
        }
      }
      else{
        // show all reports
        sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/opendate/_view/opendate?descending=true&limit=1000&endkey=' + printDate(endkey) + startkey;
      }
    }
    // common request and output of returned docs
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      var outobjs = [ ];
      var tstamp = function(t){
        return t.substring(0,4) + "-" + t.substring(4,6) + "-" + t.substring(6,8) + "T12:00:00-04:00";
      };
      try{
        body = JSON.parse(body);
      }
      catch(e){
        res.send(body);
      }
      for(var r=0;r<body.rows.length;r++){
        var rowdata = body.rows[r].value || body.rows[r].doc;
        // straightforward mapping of values to Open311 API
        var threeobj = {
          "service_request_id": rowdata._id,
          "status_notes": null,
          "agency_responsible": "Macon ECD",
          "service_notice": null,
          "address": rowdata.address.replace(',',' '),
          "address_id": rowdata.address,
          "lat": rowdata.loc[0],
          "long": rowdata.loc[1]
        };
        
        // calculate and format additional values for Open311 API output
        threeobj["requested_datetime"] = tstamp( rowdata.opendate );
        if(rowdata.closedate.length == 8){
          threeobj["status"] = "closed";
          threeobj["service_name"] = rowdata.action;
          threeobj["description"] = "Case closed with " + rowdata.action + " by " + rowdata.inspector;
          threeobj["updated_datetime"] = tstamp( rowdata.closedate );
          // service_code
          // expected_datetime          
        }
        else{
          threeobj["status"] = "open";
          threeobj["service_name"] = "Undetermined";
          threeobj["description"] = "Case opened by " + rowdata.reason;
          threeobj["updated_datetime"] = tstamp( rowdata.opendate );
          // service_code
          // expected_datetime
        }
        outobjs.push( threeobj );
        
      }
      res.send(outobjs);
    });
  });

  // not yet developed: authentication via Node.js EveryAuth
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