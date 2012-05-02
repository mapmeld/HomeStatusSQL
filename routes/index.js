/*jshint laxcomma:true */

/**
 * Module dependencies.
 */

var auth = require('../auth');

/*
 * GET home page.
 */

exports.index = function(req, res){
  
  auth.Comment.find()
      .sort('date',-1)
      .limit(20)
      .run(function(err, results)
  {
    if (err) throw err;

    res.render('index',
      {
        title: 'Poang: Index',
        comments: results
      });
    });
};

/*
 * POST add_comment
 */ 
 
 exports.add_comment = function(req,res){

   var comment = new auth.Comment;
   
   comment.body = req.param('body');

   var date = new Date();
   comment.date = date.getTime();
   
   comment.save();
   
   res.redirect('/');
 }
 
 /*
  * Example function for unit test
  */
 
exports.timesTwo = function(x){
   return x*2;
 }