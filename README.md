# About HousePointer

This is a simple app experimenting with CouchDB to store housing data. Check [openblight](https://github.com/codeforamerica/openblight) for more information on that project.

### Homepage
<img src="http://i.imgur.com/koNAz.png"/>

### Street-by-Street Results
<img src="http://i.imgur.com/naW3T.png"/>

### Click for 3-Year History
<img src="http://i.imgur.com/3ePoQ.png"/>

### Individual House History and Survey Data
<img src="http://i.imgur.com/QNAB1.png"/>

### Integration with SeeClickFix
<img src="http://i.imgur.com/03l8t.png"/>

### Open311 Server
<img src="http://i.imgur.com/Wxkmu.png"/>

### Integration with Google Prediction API
<img src="http://i.imgur.com/n3AmJ.png"/>

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