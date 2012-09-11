# About HousePointer

This is an app experimenting with CouchDB to store housing data. Check [openblight](https://github.com/codeforamerica/openblight) for more information on that project.

### Homepage
<img src="http://imgur.com/ZRfTW"/>

### Street-by-Street Results
<img src="http://i.imgur.com/WLzkJ.png"/>

### Click for 2009-2012 Code Enforcement History
<img src="http://i.imgur.com/QNQWW.png"/>

### Individual House History and Survey Data
<img src="http://i.imgur.com/pUsR0.png"/>

### Browse Open Cases Map
<img src="http://i.imgur.com/aHyDJ.png"/>

### Download as Google Earth KML
<img src="http://i.imgur.com/bqAHM.jpg"/>

### Experimental

#### Integration with SeeClickFix
<img src="http://i.imgur.com/03l8t.png"/>
<br/>
<img src="http://i.imgur.com/ZE5i9.png"/>

#### Open311 Server
<img src="http://i.imgur.com/Wxkmu.png"/>

#### Integration with Google Prediction API
<img src="http://i.imgur.com/n3AmJ.png"/>

# About the Database

## CouchDB - NoSQL database

[CouchDB](http://couchdb.apache.org/) is an open source (Apache license), NoSQL database designed around web technologies. It uses JSON to store data, JavaScript as its query language using MapReduce, and HTTP for a REST API.

CouchDB does not store data and relationships in tables. Instead, each database is a collection of independent documents. Each document maintains its own data and self-contained schema.

This project uses CouchDB for several reasons:
<ul>
  <li>Schema-less document structure lets local groups and new apps contribute data without overwriting your records.</li>
  <li>Geospatial index for easy use in maps and mobile apps</li>
  <li>Sync data between local and cloud databases</li>
  <li>Sync data between your database and mobile devices</li>
</ul>

Sources: http://guide.couchdb.org/draft/why.html and http://en.wikipedia.org/wiki/CouchDB

## IrisCouch

[IrisCouch](http://www.iriscouch.com/) hosts your CouchDB database on their servers, and includes:
<ul>
<li>Futon admin panel</li>
<li>GeoCouch geospatial data system to store latitude and longitude</li>
<li>pingquery_couchdb plugin for monitoring</li>
</ul>

IrisCouch's [pricing system](http://www.iriscouch.com/service) does not charge for hosting until an application receives heavy usage or stores gigabytes of data.

<strong>Avoid lock-in</strong>: We recommend that cities use CouchDB's built-in data syncing to keep a local back-up of their data.
So why use IrisCouch at all? We recommend that you keep the public view of your database "in the cloud" so you can handle jumps in traffic, local power and network outages, and other unpredictable events.

<a href="http://www.kennethdonaldson.net/couchdb/read-only-couchdb">Follow these directions</a> to make your IrisCouch instance read-only by anonymous users.

# About Poang Framework

## Poang - A sample node.js/MongoDB app for Heroku/MongoLab

Poang ([github](https://github.com/BeyondFog/Poang)) is a Node.js/MongoDB app built using the [Express](http://expressjs.com/) framework. Poang uses [Everyauth](http://everyauth.com/) for local authentication, [Mongoose-Auth](https://github.com/bnoguchi/mongoose-auth) to connect Everyauth to MongoDB (and [Mongoose](http://mongoosejs.com/) as the ODM) for account persistence, and [Connect-Mongo](https://github.com/kcbanner/connect-mongo) as a session store. Most of the code in app.js was generated by Express and all of the code in auth.js after the Comment schema is straight from the Mongoose-Auth docs.

For testing, Poang uses the [Mocha](http://visionmedia.github.com/mocha/) test framework, [should](https://github.com/visionmedia/should.js) for assertions, [Sinon.JS](http://sinonjs.org/) for mocks & stubs, and [Zombie.js](http://zombie.labnotes.org/) for lightweight integration testing.

For more details, please see Steve's [blog post](http://blog.beyondfog.com/?p=222) that walks through the various tests in Poang.

## Local Installation
 
1) Do a git clone:

    git clone git@github.com:mapmeld/housepointer.git
    
2) cd into the project directory and then install the necessary node modules:

    npm install -d

3) start up MongoDB if it's not already running:
  
    mongod --noprealloc --nojournal
    
4) start the node process:

    node app.js

## Deploy to Heroku

    heroku create APP_NAME -s cedar
    git push heroku master

After you have created a new app on Heroku and pushed the code via git, you will need to use the Heroku Toolbelt from your command line to add the free MongoLab starter addon:

    heroku addons:add mongolab:starter --app [your_app_name]