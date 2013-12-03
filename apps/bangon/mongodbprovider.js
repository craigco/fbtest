var mongo = require('mongodb').MongoClient;

var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL ||
    'mongodb://localhost/helperapp';

var database = null;

MongoDBProvider = function() {
    mongo.connect(mongoUri, {}, function(error, db) {
        database = db;

        database.addListener("error", function(error){
            console.log("Error connecting to MongoLab");
        });
    });
};


MongoDBProvider.prototype.getCollection = function(callback) {
    database.collection('usercollection', function(error, user_collection) {
        if (error) {
            console.log(error);
            callback(error);
        } else {
            callback(null, user_collection);
        }
    });
};

//find all users
MongoDBProvider.prototype.findAll = function(callback) {
  this.getCollection(function(error, user_collection) {
    if (error) {
      callback(error);
    } else {
      user_collection.find().toArray(function(error, results) {
        if (error) {
          callback(error)
        } else {
            callback(null, results)
        }
      });
    }
  });
};

//save new user
MongoDBProvider.prototype.saveNewUser = function(user, callback) {
  console.log("MongoDBProvider: saveNewUser");
  this.getCollection(function(error, user_collection) {
    if (error) {
        callback(error);
    } else {
      user.created_at = new Date();

      console.log("MongoDBProvider: saveNewUser insert()");
      user_collection.insert(user, function() {
        callback(null, user);
      });
    }
  });
};

exports.MongoDBProvider = MongoDBProvider;