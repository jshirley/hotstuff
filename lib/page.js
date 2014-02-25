'use strict';

var Promise  = require('es6-promise').Promise;

var _        = require('underscore');
var crypto   = require('crypto');
var request  = require('request');
var mongoose = require('mongoose');
var pageres  = require('pageres');

var PageStorage;

function hasher(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

var PageSchema = new mongoose.Schema({
  url:            String,
  canonical_url:  String,
  hashed_url:     { type : [String], index: true },
  thumbnail:      Buffer,
  content_type:   String,
  body:           String,
  score:          Number,

  sources:        Array,
  buckets:        Array,
  analytics:      Object,
  fetched:        Boolean,
  fetch_history:  Array,

  parsed_at:  { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

PageSchema.statics.analyze = function(page, callback) {
};

PageSchema.statics.newFromSource = function(url, source, cb) {
  var buckets = [];

  if ( source.bucket ) {
    buckets = _.isArray(source.bucket) ? source.bucket : [ source.bucket ];
    delete source.bucket; // Bump this out of source
  }

  var page = new PageStorage({
    url        : url,
    hashed_url : hasher(url),
    body       : null,
    score      : 0,
    fetched    : false,
    fetch_history: false,
    processed  : false,
    analytics  : { },
    buckets    : buckets,
    sources    : [ source ]
  });

  page.save(function(err, page) {
    if ( typeof cb === 'function' ) {
      return cb(err, page);
    }
    if ( err ) {
      throw "Error saving page into MongoDB: " + err;
    }
  });
};

PageSchema.statics.mergeIntoSource = function(record, url, source, cb) {
  var modified = false;

  if ( source.bucket ) {
    // FIXME: Overly naive here.
    record.buckets.push(source.bucket);
    record.buckets = _.uniq(record.buckets);
    modified = true;
    delete source.bucket;
  }

  var hasSource = _.findWhere(record.sources, { "id": source.id, source: source.source });
  if ( !hasSource ) {
    record.sources.push(source);
    modified = true;
  }

  if ( modified ) {
    record.save( function(err, page) {
      if ( typeof cb === 'function' ) {
        return cb(err, page);
      }
      if ( err ) {
        throw "Error saving page into MongoDB: " + err;
      }
    });
  } else {
    cb(null, record);
  }
};

PageSchema.statics.setupFromSource = function(url, source, cb) {
  if ( !url ) {
    throw "Missing data URL, oh no";
  }
  var self = this;

  var hashed_url = hasher(url);

  console.log('Finding URL: ' + hashed_url);
  this.find({ hashed_url: hashed_url }, function(err, pages) {
    if ( err ) {
      return;
    }
    if ( pages.length > 0 ) {
      return self.mergeIntoSource(pages[0], url, source, cb);
    }
    else {
      return self.newFromSource(url, source, cb);
    }
  });

  return hashed_url;
};

PageSchema.methods.fetch = function(cb) {
  var object = this;

  console.log("Fetching " + object.url);
  request(object.url, function(error, response, body) {
    if ( typeof response === 'undefined' ) {
      response = { statusCode: 599, headers: {} };
    }

    var res = {
      statusCode : response.statusCode,
      headers    : response.headers,
      fetched_at : Date.now()
    };

    if ( !object.fetch_history ) {
      object.fetch_history = [];
    }

    object.fetch_history.push(res);

    if ( error ) {
      // Not sure if we should null body out?
      console.log("Error fetching: " + error);
    }
    else {
      // Ensure the processed flag isn't set, we need to process the body again.
      object.processed = false;
      object.fetched   = true;
      object.body      = body;

      object.content_type = res.headers['content-type'] || 'text/plain';
    }

    object.save(function(err) {
      if ( err ) {
        console.log('Error saving page into MongoDB!');
        return cb(err);
      }
      cb(null, object);
    });
  });
};

PageSchema.methods.analyze = function(cb) {
};

module.exports = PageStorage = mongoose.model('Page', PageSchema)
