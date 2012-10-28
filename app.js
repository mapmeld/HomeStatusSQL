/*jshint laxcomma:true */

/**
 * Module dependencies.
 */
 
// Poang framework
var express = require('express')
    //, mongoose = require('mongoose')
    //, mongoose_auth = require('mongoose-auth')
    //, mongoStore = require('connect-mongo')(express)
    , routes = require('./routes')
    , middleware = require('./middleware')
    
// added http request libraries
    , http = require('http')
    , url = require('url')
    , request = require('request')

// adding MySQL support
    , mysql = require('mysql')
    , TEST_DATABASE = "codeenf"
    , TEST_TABLE = "cases"
    , client = mysql.createClient({
      user: 'root',
      password: '',
      host: 'localhost',
      port: '3306',
      database: 'codeenf'
    })
    
    ;

var HOUR_IN_MILLISECONDS = 3600000;
var session_store;

var init = exports.init = function (config) {
  
  // TODO: remove MongoDB storing sessions or cap collection
  // TODO: should MongoDB store EveryAuth logins?
  //var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;

  //mongoose.connect(db_uri);
  //session_store = new mongoStore({url: db_uri});

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
    //app.use(mongoose_auth.middleware());
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
  
  app.get('/search', function(req, res){
    var foundNumber = false;
    for(var c=0;c<req.query['address'].length;c++){
      if(req.query['address'][c] == ' '){
        continue;
      }
      if(!isNaN(req.query['address'][c])){
        // got to a number before a letter
        foundNumber = true;
        break;
      }
    }
    if(foundNumber){
      res.redirect('/statuscombine.html?address=' + req.query['address']);
    }
    else{
      res.redirect('/statusstreet.html?address=' + req.query['address']);
    }
  });
  
  app.get('/m', function(req, res){
    res.redirect('/statusmobilehome.html')
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
  
  /*app.get('/sqltest', function(req, res){
    client.query('SELECT * FROM ' + TEST_TABLE, function(err, results, fields) {
      if(err){
        throw err;
      }
      res.send(results);
      //res.send(fields);
      //client.end();
    });
  });*/
  
  app.post('/addrecord', function(req, res){
    console.log(req.body.closedate);
    client.query('INSERT INTO cases (address, cleanaddress, streetname, action, opendate, closedate, ecd_id, inspectcodes, reason, latitude, longitude, neighborhood) VALUES("' + req.body.address + '", "' + req.body.cleanaddress + '", "' + req.body.streetname + '", "' + req.body.action + '", "' + req.body.opendate + '", "' + req.body.closedate + '", "' + req.body.ecd_id + '", "' + req.body.inspectcodes + '", "' + req.body.reason + '", ' + req.body.latitude + ', ' + req.body.longitude + ', "' + req.body.neighborhood + '")', function(err, results, fields){
      res.send({});
    });
  });
  
  // Code Enforcement Case History URLs
  app.get('/keydb', function(req, res){
    // Request a house's code enforcement history by its original address code (formats vary, looks like " 1200,Sample St,  Macon,  GA  31212")
    var street = req.query["address"];
    client.query('SELECT * FROM ' + TEST_TABLE + ' WHERE address = \'' + street.replace('\'','\\\'') + '\'', function(err, results, fields) {
      if(err){
        throw err;
      }
      res.setHeader('Content-Type', 'application/json');
      res.send(results);
    });
  });
  
  app.get('/house', function(req, res){
    // Request a house's code enforcement history by a cleaned-up address (looks like "1200 Sample St" or "1200 SAMPLE ST")
    var street = req.query["address"].toLowerCase();
    client.query('SELECT * FROM ' + TEST_TABLE + ' WHERE cleanaddress = \'' + street.replace('\'','\\\'') + '\'', function(err, results, fields){
      res.setHeader('Content-Type', 'application/json');
      res.send(results);
    });
  });
  
  app.get('/searchdb*', function(req, res){
    // Return code enforcement cases by street name ( looks like "Sample St", "Sample Street", etc )
    var street = req.query["streetname"];
    street = street.toLowerCase();
    street = street.replace("street","st");
    street = street.replace("avenue","ave");
    street = street.replace("lane","ln");
    street = street.replace("circle","cir");
    street = street.replace("place","pl");
    street = street.replace("north","n");
    street = street.replace("south","s");
    street = street.replace("east","e");
    street = street.replace("west","w");
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

    client.query('SELECT * FROM ' + TEST_TABLE + ' WHERE streetname = \'' + street.replace('\'','\\\'') + '\'', function(err, results, fields){
      if(req.url.indexOf("kml") > -1){
        // KML API for mapping mash-ups
        res.setHeader('Content-Type', 'application/kml');

        var kmlintro = '<?xml version="1.0" encoding="UTF-8"?>\n';
        kmlintro += '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        kmlintro += '<Document>\n	<name>Macon Housing API</name>\n';
        if(req.query["nl"] == "true"){
          var kmllink = '    <NetworkLink>\n      <name>Housing Data Link</name>\n      <visibility>1</visibility>\n      <open>1</open>\n      <description>Keeps your housing data up to date!</description>\n      <refreshVisibility>0</refreshVisibility>\n      <flyToView>1</flyToView>\n      <Link>\n';
          kmllink += '        <href>http://' + req.headers.host + req.url.replace('nl=true','nl=false') +  '</href>\n';
          kmllink += '      </Link>\n    </NetworkLink>\n';
          var kmlend = '</Document>\n</kml>';
          res.send(kmlintro + kmllink + kmlend);
          return;
        }
        kmlintro += '	<Style id="OpenCase">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-01.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        kmlintro += '	<Style id="NoViolations">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-03.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        kmlintro += '	<Style id="PastViolations">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-02.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        
		// Placemarks
		var kmlplacemarks = '';
		var prevAddresses = { };

		for(i=0;i<results.length;i++){
          if(prevAddresses[results[i].address]){
            // already thinking about this address
            if(!prevAddresses[results[i].address].lat && results[i].latitude){
              prevAddresses[results[i].address].lat = results[i].latitude * 1.0;
              prevAddresses[results[i].address].lng = results[i].longitude * 1.0;
            }
            prevAddresses[results[i].address].cases.push({
              id: results[i].ecd_id,
              inspector: results[i].inspectcodes,
              opendate: results[i].opendate,
              action: results[i].action,
              closedate: results[i].closedate
            });
          }
          else{
            if(results[i].latitude){
              prevAddresses[results[i].address] = {
                lat: results[i].latitude * 1.0,
                lng: results[i].longitude * 1.0
              };
            }
            else{
              prevAddresses[results[i].address] = { };
            }
            prevAddresses[results[i].address].cases = [{
              id: results[i].ecd_id,
              inspector: results[i].inspectcodes,
              opendate: results[i].opendate,
              action: results[i].action,
              closedate: results[i].closedate,
              cause: results[i].reason
            }];
          }
        }

        for(address in prevAddresses){
          if(!prevAddresses[address].lat){
            // don't map unmappable addresses
            continue;
          }
          kmlplacemarks += '		<Placemark>\n			<name>' + address + '</name>\n			<address>' + address + '</address>\n';
          kmlplacemarks += '			<description><![CDATA[<div class="googft-info-window" style="font-family:sans-serif">';
          prevAddresses[address].cases.sort( function(a,b){ return b.id * 1 - a.id * 1; } );
          var notsobad = true;
          var opencase = false;
		  for(var pt=0;pt<prevAddresses[address].cases.length;pt++){
		    if(prevAddresses[address].cases[pt].action.indexOf("No Violation") == -1){
		      notsobad = false;
		    }
		    if(isNaN(1 * prevAddresses[address].cases[pt].closedate) || !prevAddresses[address].cases[pt].closedate){
		      opencase = true;
		    }
		    kmlplacemarks += '<h4>Case ' + prevAddresses[address].cases[pt].id + '</h4><b>Opened:</b> ' + prevAddresses[address].cases[pt].opendate + '<br><b>Closed:</b> ' + prevAddresses[address].cases[pt].closedate + '<br><b>Inspection Code:</b> ' + prevAddresses[address].cases[pt].inspectcodes + '<br><b>Action:</b> ' + prevAddresses[address].cases[pt].action.replace("BIC","Brought into Compliance") + '<br><b>Cause:</b> ' + prevAddresses[address].cases[pt].cause;
		  }
		  kmlplacemarks += '</div>]]></description>\n';
		  if(opencase){
		    kmlplacemarks += '			<styleUrl>#OpenCase</styleUrl>\n';
		  }
		  else if(notsobad){
		    kmlplacemarks += '			<styleUrl>#NoViolations</styleUrl>\n';
		  }
		  else{
		    kmlplacemarks += '			<styleUrl>#PastViolations</styleUrl>\n';
		  }
		  kmlplacemarks += '			<Point>\n				<coordinates>' + prevAddresses[address].lng + ',' + prevAddresses[address].lat + ',0</coordinates>\n			</Point>\n		</Placemark>\n';
		}
		var kmlend = '</Document>\n</kml>';
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
        res.send(results);
      }
    });
  });
  
  // Combined KML file for Code Enforcement, Survey
  app.get('/export.kml', function(req, res){
    if(req.query['streetname']){
      res.redirect('/searchdb.kml?streetname=' + req.query['streetname'] + "&nl=" + req.query['nl']);
      return;
    }
    var street = req.query['address'];
    client.query('SELECT * FROM ' + TEST_TABLE + ' WHERE cleanaddress = \'' + street.replace('\'','\\\'') + '\'', function(err, results, fields){
      /*var sendurl = 'http://nickd.iriscouch.com:5984/housing/_design/poll1/_view/Poll1?key=' + encodeURIComponent( '"' + street + '"');
      var requestOptions = {
        'uri': sendurl,
      };
      request(requestOptions, function (err, response, surveybody) {*/
        //surveybody = JSON.parse(surveybody);
        
        var address, lat, lng;
        if(results.length){
          address = results[0].cleanaddress;
          lat = results[0].latitude;
          lng = results[0].longitude;
        }
        /*else if(surveybody.rows.length){
          address = surveybody.rows[0].value.address;
          lat = surveybody.rows[0].value.loc[0];
          lng = surveybody.rows[0].value.loc[1];
        }*/

        res.setHeader('Content-Type', 'application/kml');
        var kmlintro = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n<Document>\n	<name>Macon Housing API</name>\n';
        if(req.query["nl"] == "true"){
          var kmllink = '    <NetworkLink>\n      <name>Housing Data Link</name>\n      <visibility>1</visibility>\n      <open>1</open>\n      <description>Keeps your housing data up to date!</description>\n      <refreshVisibility>0</refreshVisibility>\n      <flyToView>1</flyToView>\n      <Link>\n';
          kmllink += '        <href>http://' + req.headers.host + req.url.replace('nl=true','nl=false') +  '</href>\n';
          kmllink += '      </Link>\n    </NetworkLink>\n';
          var kmlend = '</Document>\n</kml>';
          res.send(kmlintro + kmllink + kmlend);
          return;
        }
        kmlintro += '	<Style id="OpenCase">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-01.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        kmlintro += '	<Style id="NoViolations">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-03.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        kmlintro += '	<Style id="PastViolations">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-02.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        // Placemarks
        var kmlplacemarks = '		<Placemark>\n			<name>' + address + '</name>\n			<address>' + address + '</address>\n';
        kmlplacemarks += '			<description><![CDATA[<div class="googft-info-window" style="font-family:sans-serif">';
        var notsobad = true;
        var opencase = false;
        if(results.length){
          kmlplacemarks += '<h3>Code Enforcement</h3><b>Address:</b>' + address + '<br><b>Neighborhood:</b> ' + (results[0].neighborhood || '');
          kmlplacemarks += '<hr>';
          results.sort(function(a,b){ return b.ecd_id * 1 - a.ecd_id * 1 });

          for(var r=0;r<results.length;r++){
            if(results[r].action.indexOf("No Violation") == -1){
              notsobad = false;
            }
            if(isNaN( 1 * results[r].closedate) || !results[r].closedate){
              opencase = true;
            }
            kmlplacemarks += '<h4>Case ' + results[r].ecd_id + '</h4><b>Opened:</b> ' + results[r].opendate + '<br><b>Closed:</b> ' + results[r].closedate + '<br><b>Inspection Code:</b> ' + results[r].inspectcodes + '<br><b>Cause:</b> ' + results[r].reason;
          }
        }
        /*if(surveybody.rows.length){
          kmlplacemarks += '<h3>Survey</h3><b>Inspected:</b> ' + surveybody.rows[0].value.inspdate + '<br><b>Major Damage?</b> ' + surveybody.rows[0].value.major + '<br><b>Minor Damage?</b> ' + surveybody.rows[0].value.minor + '<br><b>Open?</b> ' + surveybody.rows[0].value.open + '<br><b>Boarded?</b> ' + surveybody.rows[0].value.boarded + '<br><b>Secure?</b> ' + surveybody.rows[0].value.secure + '<br><b>Burned?</b> ' + surveybody.rows[0].value.burned;
        }*/
        kmlplacemarks += '</div>]]></description>\n';
		if(opencase){
		  kmlplacemarks += '			<styleUrl>#OpenCase</styleUrl>\n';
		}
		else if(notsobad){
		  kmlplacemarks += '			<styleUrl>#NoViolations</styleUrl>\n';
		}
		else{
		  kmlplacemarks += '			<styleUrl>#PastViolations</styleUrl>\n';
		}
        kmlplacemarks += '			<Point>\n				<coordinates>' + lng + ',' + lat + ',0</coordinates>\n			</Point>\n		</Placemark>\n';
        var kmlend = '</Document>\n</kml>';
        res.send(kmlintro + kmlplacemarks + kmlend);
      //});      
    });
  });
 
  // Code Enforcement's recent cases: recent opens and recent closes
  app.get('/recentopen', function(req, res){
    client.query('SELECT * FROM ' + TEST_TABLE + ' ORDER BY opendate DESC LIMIT 5', function(err, results, fields){
      res.send(results);
    });
  });
  app.get('/recentclose', function(req, res){
    client.query('SELECT * FROM ' + TEST_TABLE + ' ORDER BY closedate DESC LIMIT 5', function(err, results, fields){
      res.send(results);
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
    street = street.replace("Street","st");
    street = street.replace("Avenue","ave");
    street = street.replace("Lane","ln");
    street = street.replace("Circle","cir");
    street = street.replace("First","1st");
    street = street.replace("Second","2nd");
    street = street.replace("Third","3rd");
    street = street.replace("Fourth","4th");
    street = street.replace("Fifth","5th");
    street = street.replace("Sixth","6th");
    street = street.replace("Seventh","7th");
    street = street.replace("Eighth","8th");
    street = street.replace("Ninth","9th");
    street = street.replace("North","N");
    street = street.replace("South","S");
    street = street.replace("East","E");
    street = street.replace("West","W");

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

    var querystring = 'SELECT * FROM ' + TEST_TABLE + ' WHERE latitude < ' + north + ' AND latitude > ' + south + ' AND longitude < ' + east + ' AND longitude > ' + west;
    if(req.query["status"] == "open"){
      var now = new Date();
      var cutoffdate = new Date(now - 280 * 24 * 60 * 60 * 1000);
      var cutoffmonth = cutoffdate.getMonth() + 1;
      if(cutoffmonth < 10){
        cutoffday = "0" + cutoffmonth;
      }
      var cutoffday = cutoffdate.getDate();
      if(cutoffday < 10){
        cutoffday = "0" + cutoffday;
      }
      var cutoffslug = cutoffdate.getFullYear() + "" + cutoffmonth + "" + cutoffday;
      querystring += ' AND closedate = \'\' AND opendate > ' + cutoffslug;
    }
    
    client.query(querystring, function(err, results, fields){
      if(req.url.indexOf("kml") > -1){
        // KML API for mapping mash-ups
        res.setHeader('Content-Type', 'application/kml');
        var kmlintro = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n<Document>\n	<name>Macon Housing API</name>\n'
        if(req.query["nl"] == "true"){
          var kmllink = '    <NetworkLink>\n      <name>Housing Data Link</name>\n      <visibility>1</visibility>\n      <open>1</open>\n      <description>Keeps your housing data up to date!</description>\n      <refreshVisibility>0</refreshVisibility>\n      <flyToView>1</flyToView>\n      <Link>\n';
          kmllink += '        <href>http://' + req.headers.host + req.url.replace('nl=true','nl=false') +  '</href>\n';
          kmllink += '      </Link>\n    </NetworkLink>\n';
          var kmlend = '</Document>\n</kml>';
          res.send(kmlintro + kmllink + kmlend);
          return;
        }
        kmlintro += '	<Style id="OpenCase">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-01.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        kmlintro += '	<Style id="NoViolations">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-03.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        kmlintro += '	<Style id="PastViolations">\n		<IconStyle>\n			<scale>1.1</scale>\n			<Icon>\n				<href>http://homestatus.herokuapp.com/images/macon-marker-02.png</href>\n			</Icon>\n			<hotSpot x="0.5" y="0" xunits="fraction" yunits="fraction"/>\n		</IconStyle>\n		<BalloonStyle>\n			<text>$[description]</text>\n		</BalloonStyle>\n	</Style>\n';
        
		// Placemarks
		var kmlplacemarks = '';
		var prevAddresses = { };
		
		for(i=0;i<results.length;i++){
          if(prevAddresses[results[i].address]){
            // already thinking about this address
            if(!prevAddresses[results[i].address].lat && results[i].loc){
              prevAddresses[results[i].address].lat = results[i].latitude * 1.0;
              prevAddresses[results[i].address].lng = results[i].longitude * 1.0;
            }
            prevAddresses[results[i].address].cases.push({
              id: results[i].ecd_id,
              inspector: results[i].inspectcodes,
              opendate: results[i].opendate,
              action: results[i].action,
              closedate: results[i].closedate
            });
          }
          else{
            if(results[i].loc){
              prevAddresses[results[i].address] = {
                lat: results[i].latitude * 1.0,
                lng: results[i].longitude * 1.0
              };
            }
            else{
              prevAddresses[results[i].address] = { };
            }
            prevAddresses[results[i].address].cases = [{
              id: results[i].ecd_id,
              inspector: results[i].inspectcodes,
              opendate: results[i].opendate,
              action: results[i].action,
              closedate: results[i].closedate,
              cause: results[i].reason
            }];
          }
        }

        for(address in prevAddresses){
          if(!prevAddresses[address].lat){
            // don't map unmappable addresses
            continue;
          }
          kmlplacemarks += '		<Placemark>\n			<name>' + address + '</name>\n			<address>' + address + '</address>\n';
          kmlplacemarks += '			<description><![CDATA[<div class="googft-info-window" style="font-family:sans-serif">';
          prevAddresses[address].cases.sort( function(a,b){ return b.id * 1 - a.id * 1; } );
          var opencase = false;
          var notsobad = true;
		  for(var pt=0;pt<prevAddresses[address].cases.length;pt++){
		    if(prevAddresses[address].cases[pt].action.indexOf("No Violation") == -1){
		      notsobad = false;
		    }
		    if(isNaN(1 * prevAddresses[address].cases[pt].closedate) || !prevAddresses[address].cases[pt].closedate){
		      opencase = true;
		    }
		    kmlplacemarks += '<h4>Case ' + prevAddresses[address].cases[pt].id + '</h4><b>Opened:</b> ' + prevAddresses[address].cases[pt].opendate + '<br><b>Closed:</b> ' + prevAddresses[address].cases[pt].closedate + '<br><b>Inspection Code:</b> ' + prevAddresses[address].cases[pt].inspectcodes + '<br><b>Action:</b> ' + prevAddresses[address].cases[pt].action.replace("BIC","Brought into Compliance") + '<br><b>Cause:</b> ' + prevAddresses[address].cases[pt].cause;
		  }
		  kmlplacemarks += '</div>]]></description>\n';
		  if(opencase){
		    kmlplacemarks += '			<styleUrl>#OpenCase</styleUrl>\n';
		  }
		  else if(notsobad){
		    kmlplacemarks += '			<styleUrl>#NoViolations</styleUrl>\n';
		  }
		  else{
		    kmlplacemarks += '			<styleUrl>#PastViolations</styleUrl>\n';
		  }
		  kmlplacemarks += '			<Point>\n				<coordinates>' + prevAddresses[address].lng + ',' + prevAddresses[address].lat + ',0</coordinates>\n			</Point>\n		</Placemark>\n';
		}
		var kmlend = '</Document>\n</kml>';
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
        res.send(results);
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
    var street = req.query["address"].toLowerCase();
    var sendurl = 'http://nickd.iriscouch.com:5984/housing/_design/poll1/_view/Poll1?key=' + encodeURIComponent( '"' + street + '"');
    //res.send(sendurl);
    var requestOptions = {
      'uri': sendurl,
    };
    request(requestOptions, function (err, response, body) {
      res.setHeader('Content-Type', 'application/json');
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
    street = street.replace("circle","cir");
    street = street.replace("1st","first");
    street = street.replace("2nd","second");
    street = street.replace("3rd","third");
    street = street.replace("4th","fourth");
    street = street.replace("5th","fifth");
    street = street.replace("6th","sixth");
    street = street.replace("7th","seventh");
    street = street.replace("8th","eighth");
    street = street.replace("9th","ninth");

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
    var case_id = req.url.substring( req.url.indexOf("/requests/") + 10, req.url.indexOf(".") );
    client.query('SELECT * FROM ' + TEST_TABLE + ' WHERE ecd_id = \'' + case_id.replace('\'','\\\'') + '\'', function(err, results, fields){

      var tstamp = function(t){
        return t.substring(0,4) + "-" + t.substring(4,6) + "-" + t.substring(6,8) + "T12:00:00-04:00";
      };

      // straightforward mapping of values to Open311 API
      var threeobj = {
        "service_request_id": results[0].id,
        "status_notes": null,
        "agency_responsible": "Macon ECD",
        "service_notice": null,
        "address": results[0].cleanaddress,
        "address_id": results[0].address,
        "lat": results[0].latitude,
        "long": results[0].longitude
      };
        
      // calculate and format additional values for Open311 API output
      threeobj["requested_datetime"] = tstamp( results[0].opendate );
      if(results[0].closedate.length == 8){
        threeobj["status"] = "closed";
        threeobj["service_name"] = results[0].action;
        threeobj["description"] = "Case closed with " + results[0].action + " with outcome " + results[0].inspectcodes;
        threeobj["updated_datetime"] = tstamp( results[0].closedate );
        // expected_datetime
        threeobj["service_code"] = "2";
      }
      else{
        threeobj["status"] = "open";
        threeobj["service_name"] = "Undetermined";
        threeobj["description"] = "Case opened by " + results[0].reason;
        threeobj["updated_datetime"] = tstamp( results[0].opendate );
        // expected_datetime
        threeobj["service_code"] = "1";
      }
      res.send(threeobj);
    });
  });

  app.get('/311/requests.json', function(req, res){
    var querystring = 'SELECT * FROM ' + TEST_TABLE;
    if(req.query['service_request_id'] && req.query['service_request_id'].length){
      // this query asks for multiple service requests by their id
      // any other parameters in the URL are ignored
      var service_requests = req.query['service_request_id'].split(',');
      sendurl = 'http://nickd.iriscouch.com:5984/cases/_all_docs?include_docs=true&keys=' + encodeURIComponent('["') + encodeURIComponent( service_requests.join('","') ) + encodeURIComponent('"]');
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
        // if the startkey wasn't specified or would make this search invalid, set it to 90 days before the endkey
        if(endkey > startkey || !req.query['start_date'] || !req.query['start_date'].length){
          endkey = new Date(startkey - 90 * 24 * 60 * 60 * 1000);
        }
        startkey = "&startkey=" + printDate(startkey);
      }
      if((req.query['status'] && req.query['status'].length)||(req.query['service_code'] && req.query['service_code'].length)){
        if((req.query['status'] && req.query['status'] == "open")||(req.query['service_code'] && req.query['service_code'] == "1")){
          // show only the open cases
          querystring += " WHERE closedate = '' AND opendate > '" + printDate(endkey) + startkey + "' SORT BY opendate DESC LIMIT 1000";
          //sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/isopendate/_view/isopendate?descending=true&limit=1000&startkey=' + printDate(endkey) + startkey;
        }
        else{
          // show only the closed cases
          querystring += " WHERE closedate != '' AND opendate > '" + printDate(endkey) + startkey + "' SORT BY opendate DESC LIMIT 1000";
          //sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/closedate/_view/closedate?descending=true&limit=1000&endkey=' + printDate(endkey) + startkey;
        }
      }
      else{
        // show all reports
        querystring += " WHERE opendate > '" + printDate(endkey) + startkey + "' SORT BY opendate DESC LIMIT 1000";
        //sendurl = 'http://nickd.iriscouch.com:5984/cases/_design/opendate/_view/opendate?descending=true&limit=1000&endkey=' + printDate(endkey) + startkey;
      }
    }
    // common request and output of returned docs
    /*if(req.query['showme'] == 'url'){
      res.send(sendurl);
      return;
    }*/

    client.query(querystring, function(err, results, fields){
      var outobjs = [ ];
      var tstamp = function(t){
        return t.substring(0,4) + "-" + t.substring(4,6) + "-" + t.substring(6,8) + "T12:00:00-04:00";
      };
      /*if(req.query['showme'] == 'json'){
        res.send(results);
        return;
      }*/

      for(var r=0;r<results.length;r++){
        var rowdata = results[r];
        // straightforward mapping of values to Open311 API
        var threeobj = {
          "service_request_id": rowdata.id,
          "status_notes": null,
          "agency_responsible": "Macon ECD",
          "service_notice": null,
          "address": rowdata.cleanaddress,
          "address_id": rowdata.address,
          "lat": rowdata.latitude,
          "long": rowdata.longitude
        };
        
        // calculate and format additional values for Open311 API output
        threeobj["requested_datetime"] = tstamp( rowdata.opendate );
        if(rowdata.closedate.length == 8){
          threeobj["status"] = "closed";
          threeobj["service_name"] = rowdata.action;
          threeobj["description"] = "Case closed with " + rowdata.action + " and " + rowdata.inspectcodes;
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

  //mongoose_auth.helpExpress(app);

  return app;
};

// Don't run if require()'d
if (!module.parent) {
  var config = require('./config');
  var app = init(config);
  app.listen(process.env.PORT || 3000);
  console.info("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}