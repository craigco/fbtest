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

MongoDBProvider.prototype.getCollectionCount = function(collectionToCount, callback) {
  database.collection(collectionToCount, function(error, collection) {
    if (error) {
      console.log(error);
      callback(error);
    } else {
      collection.find().count(function (e, count) {
        callback(e, count);
      });
    }
  });
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
      collection.find(key, collection, function(error, results) {
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

MongoDBProvider.prototype.update = function(selector, collection, document, options, callback) {
  console.log("update");
  this.getCollection(collection, function(error, collection) {
    if (error) {
      callback(error);
    } else {
      console.log(selector);
      console.log(document);
      console.log(options);
      collection.update(selector, document, options, function(err, result) {
        callback(err);
      });
    }
  });
};

exports.MongoDBProvider = MongoDBProvider;