'use strict';

var async    = require('async');
var _        = require('underscore');
var winston  = require('winston');
var CONFIG   = require('config');
var mongoose = require('mongoose');
var Promise  = require('es6-promise').Promise;

var Page     = require('./page');

if ( !CONFIG.database ) {
  throw "No database specified, edit configuration for MongoDB config";
}

var sources = {
  reddit: require('./sources/reddit')
}

var analyzers = {};
//require('./analyzer/keywords')(analyzers)
require('./analyzer/aylien')(analyzers)

var Hotstuff = {
  logger:    winston,
  sources:   sources,
  analyzers: analyzers,
  config:    CONFIG,
  Page:      Page
};

Hotstuff.fetchPagesFromConfig = function(categories) {
  var list = categories || {};

  var promise  = new Promise(function(resolve, reject) {
    var entities = [];
    var fetching = 0;
    var fetched  = 0;

    Object.keys(list).forEach(function(bucket) {
      fetching += list[bucket].length;
      list[bucket].forEach(function(source) {
        if ( sources.hasOwnProperty(source.source) ) {
          sources[source.source].fetch(source.query, bucket).then(
            function(entity) {
              console.log('resolving fetch with entity? ' + _.isArray(entity));
              // If we have an array that is sent in, concat to the list,
              // otherwise push.
              if ( _.isArray(entity) ) {
                entities = entities.concat(entity);
              } else {
                entities.push(entity);
              }

              fetched++;
              if ( fetched >= fetching ) {
                resolve(entities);
              }
            },
            function(reason) {
              fetched++;
            }
          );
        }
      });
    });
  });

  return promise;
};

Hotstuff.fetchPendingPages = function() {
  var collection = this.Page,
      logger     = this.logger;

  return new Promise(function(resolve, reject) {
    Page.find({ 'fetched' : false }, function(err, results) {
      if ( err ) {
        logger.debug('Error unfetched pages: ' + err);
        return reject(err);
      }

      var fetched = 0;
      logger.info('Found ' + results.length + ' unfetched pages');
      results.forEach( function(page) {
        logger.info("Fetching " + page.url);
        page.fetch( function(err) {
          if ( err ) {
            logger.info("Error fetching page " + page.url + ": " + err);
          } else {
            logger.info("Saved " + page.url);
          }
          fetched++;
          logger.info("Processing %d/%d", fetched, results.length);
          if ( fetched === results.length ) {
            resolve(results);
          }
        });
      });
    });
  });
};

Hotstuff.analyze = function() {
  var collection = this.Page,
      logger     = this.logger,
      config     = this.config,
      analyzers  = this.analyzers;

  config = this.config.analyzers || {};

  return new Promise(function(resolve, reject) {
    var list = Object.keys(analyzers);

    list.forEach(function(name) {
      var Analyzer = analyzers[name],
          AnalyzerConfig = config[name] || {};
      logger.info('Processing analyzer ' + name);
      Page.findOne({
        // FIXME: We only analyze markup? (This should probably be the analyzer content types)
        'content_type' : /^text\/html/,
        'fetched'      : true,
        'processed'    : false,
        '$or' : [
          { 'processors' : { '$elemMatch' : { name: { '$exists' : false } } } },
          { 'processors' : { '$size' : 0 } }
        ]
      }, function(err, records) {
        if ( err ) {
          logger.error('Failed fetching records for analyzer ' + name + ': ' + err);
          logger.error(err);
          return reject(err);
        }

        records = [ records ];

        var processed = 0;

        records.forEach(function(record) {
          var analyzer = new Analyzer(record, AnalyzerConfig);
          analyzer.process()
            .then(function(extracted) {
              processed++;
              logger.info("Finished processing %s with %s: (completed %d out of %d)", record.url, name, processed, list.length);
              logger.info("New data is:");
              logger.info(extracted);

              record.processors[name] = extracted;
              if ( processed >= list.length ) {
                resolve(records);
              }
            });
        });
        //resolve(records);
      });
    });
  });
};

Hotstuff.exit = function() {
  mongoose.disconnect();
};

Hotstuff.run = function(config) {
  this.fetchPagesFromConfig(config.categories)
  .then(
    function(entities) {
      console.log('Got a total of ' + entities.length + ' back');
      console.log(entities);
    },
    function(reason) {
      console.log('Failed this batch of things: ' + reason);
    }
  );

  //console.log(config);
};

Hotstuff.initialize = function() {
  return new Promise(function( resolve, reject ) {
    mongoose.connect(CONFIG.database);
    Hotstuff.db = mongoose.connection;
    Hotstuff.db.on('open', function() {
      resolve(Hotstuff);
    });
    Hotstuff.db.on('error', function(err) {
      reject(err);
    });
  });
};

module.exports = Hotstuff;

