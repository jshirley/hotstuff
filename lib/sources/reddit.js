'use strict';

var Page    = require('../page');

var Queue   = require('queue-async');

var request = require('request');
var Promise = require('es6-promise').Promise;

function RedditSource() {
  this.template = 'http://reddit.com/r/{subreddit:safe}/search.json?q={q}&restrict_sr={restrict_sr}&t={t}&sort={sort}';
  this.options = {
    'subreddit'   : null,
    'q'           : 'self:no',
    'sort'        : 'hot',
    't'           : 'week',
    'restrict_sr' : 'on',
  };
}

RedditSource.prototype._constructURL = function(query) {
  var options = {},
      defaults = this.options,
      url = this.template;

  Object.keys(defaults).forEach(function(key) {
    if ( query.hasOwnProperty(key) ) {
      options[key] = query[key];
    }
    else if ( defaults.hasOwnProperty(key) && defaults[key] !== null ) {
      options[key] = defaults[key];
    }
    else {
      throw "Missing configuration, require " + key + " in Reddit source configuration";
    }
    url = url.replace('{' + key + ':safe}', options[key], 'g');
    url = url.replace('{' + key + '}', encodeURIComponent(options[key]), 'g');
  });

  return url;
}

RedditSource.prototype._fetchRemote = function(url, success, failure) {
  request(url, function(error, response, body) {
    if ( !error && response.statusCode === 200 ) {
      return success(body);
    }
    failure("Error processing " + url + ", received status code " + response.statusCode + "\n" + body);
  });
};

// Will return Array[Page]
RedditSource.prototype.parse = function(data, bucket, cb) {
  var raw = JSON.parse(data);

  var children = raw.hasOwnProperty('data') && raw.data.hasOwnProperty('children') ? raw.data.children : [];
  var pages    = [];
  var errors   = null;

  children.forEach(function(entry) {
    var url    = entry.data.url;
    var source = entry;

    // Need to add things to the top level for finding stuff easier
    source.id     = entry.data.id;
    source.source = 'reddit';
    source.bucket = bucket;

    /* Structure of source should look like:
     * {
     *   "id" : "unique identifier",
     *   "source" : "reddit", (Name of the source, basically this module name)
     *   "bucket" : "personal-growth", (This gets extracted in storage, but Page expects it in the source to explain why we're adding it)
     * }
     */
    Page.setupFromSource(url, source,
      function(err, page) {
        if ( err ) {
          if ( errors === null ) {
            errors = [];
          }
          errors.push(err);
        }

        pages.push(page);
        if ( pages.length === children.length ) {
          cb(errors, pages);
        }
      }
    );
  });
};

RedditSource.prototype.fetch = function(query, bucket) {
  var url  = this._constructURL(query),
      self = this;

  return new Promise( function(resolve, reject) {
    self._fetchRemote(url,
      function(data) {
        try {
          self.parse(data, bucket,
            function(err, parsed) {
              if ( err ) {
                return reject(err);
              }
              console.log('parse cb: ');
              resolve(parsed);
            }
          );
        } catch(e) {
          reject(e);
        }
      },
      reject
    );
  });
}

module.exports = new RedditSource();

