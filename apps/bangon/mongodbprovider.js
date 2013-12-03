var mongo = require('mongodb').MongoClient;

var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL;

var database = null;
var activeCollection = null;

MongoDBProvider = function() {
    mongo.connect(mongoUri, {}, function(error, db) {
        database = db;

        database.addListener("error", function(error){
            console.log("Error connecting to MongoLab");
        });
    });
};

MongoDBProvider.prototype.setActiveCollection = function(collection) {
  activeCollection = collection;
};

MongoDBProvider.prototype.getActiveCollection = function(callback) {
  if (activeCollection == null) {
    console.log("MongdoDBProvide: activeCollection not set");
    callback(error);
  } else {
    this.getCollection(activeCollection, callback);
  }
};

MongoDBProvider.prototype.getCollection = function(collectionToGet, callback) {
  database.collection(collectionToGet, function(error, collection) {
    if (error) {
      console.log(error);
      callback(error);
    } else {
      callback(null, collection);
    }
  });
};

//find all users
MongoDBProvider.prototype.findAll = function(callback) {
  this.getActiveCollection(function(error, user_collection) {
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
MongoDBProvider.prototype.saveNewFacebookUser = function(user, callback) {
  console.log("MongoDBProvider: saveNewUser");
  this.getActiveCollection(function(error, collection) {
    if (error) {
      callback(error);
    } else {
      user.created_at = new Date();

      // wrap in facebook node
      var modified_user = {
          fb: user
      };

      console.log("MongoDBProvider: saveNewUser insert()");
      collection.insert(modified_user, function() {
        callback(null, modified_user);
      });
    }
  });
};

MongoDBProvider.prototype.save = function(data, collection, callback) {
  this.getCollection(collection, function(error, collection) {
    if (error) {
      callback(error);
    } else {
      collection.insert(data, function() {
        callback();
      });
    }
  });
};

exports.MongoDBProvider = MongoDBProvider;