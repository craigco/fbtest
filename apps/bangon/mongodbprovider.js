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

MongoDBProvider.prototype.findAll = function(collection, callback) {
  this.getCollection(collection, function(error, collection) {
    if (error) {
      callback(error);
    } else {
      collection.find().toArray(function(error, results) {
        if (error) {
          callback(error)
        } else {
            callback(null, results)
        }
      });
    }
  });
};

MongoDBProvider.prototype.find = function(key, collection, callback) {
  this.getCollection(collection, function(error, collection) {
    if (error) {
      callback(error);
    } else {
      collection.find(key, collection).toArray(function(error, results) {
        if (error) {
          callback(error)
        } else {
          callback(null, results)
        }
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