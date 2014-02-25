
var _       = require('underscore');
var Promise = require('es6-promise').Promise;
var request = require('request');

function AylienAnalyzer(page, config) {
  this.page = page;

  // FIXME: This needs to move into config
  this.api_key = { "X-Mashape-Authorization" : config.api_key };

  // TODO: This should be in configuration somewhere, not here.
  // All available analytics we know about
  var analysis_types = {
    sentences : {
      url: 'https://aylien-text.p.mashape.com/summarize?url={url}',
      extract: 'sentences'
    },
    classification : {
      url: 'https://aylien-text.p.mashape.com/classify?url={url}',
      extract: 'categories'
    },
    hashtags : {
      url: 'https://aylien-text.p.mashape.com/hashtags?url={url}',
      extract: 'hashtags'
    },
    concepts : {
      url: 'https://aylien-text.p.mashape.com/concepts?url={url}',
      extract: this._extractConcepts.bind(this)
    }
  };

  var analyzers = {};

  config.analytics.forEach(function(key) {
    if ( ! analysis_types.hasOwnProperty(key) ) {
      throw "The Aylien analyzer doesn't understand requested analysis `" + key + "`";
    }
    analyzers[key] = _.clone(analysis_types[key]);
  });
  this.analyzers = analyzers;
}

AylienAnalyzer.contentType = function() {
  return /^text\/html/;
}

AylienAnalyzer.prototype._extractConcepts = function(data) {
  var extracted = { concepts: [] };
  _.values(data.concepts).forEach(function(concept) {
    concept.surfaceForms.forEach(function(form) {
      if ( form.score > 0.9 ) {
        extracted.concepts.push(form.string);
      }
    });
  });

  return extracted;
}

AylienAnalyzer.prototype.process = function() {
  var analysis_types = this.analyzers;

  var page_url  = this.page.url;
  var self      = this;
  var extracted = {};

  return new Promise(function(resolve, reject) {
    var keys = Object.keys(analysis_types),
        completed = 0;

    console.log('Processing ' + keys.length + ' endpoints from Aylien');
    keys.forEach(function(type) {
      var config = analysis_types[type];
      var url    = config.url.replace('{url}', encodeURIComponent(page_url));
      console.log(' -> ' + type + ' -> ' + url);
      self._request(url)
        .then(function(response) { return JSON.parse(response.body) })
        .then(function(data) {
          if ( _.isFunction(config.extract) ) {
            extracted = _.extend(extracted, config.extract(data));
          }
          else {
            var newData = {};
            newData[config.extract] = data[config.extract];
            extracted = _.extend(extracted, newData);
          }

          completed++;

          if ( completed >= keys.length ) {
            resolve(extracted);
          }

          return extracted;
        })
        .catch(function(err) {
          console.log('Oh no, we errored out!');
          console.log(err);
        });
    });
  });
};

AylienAnalyzer.prototype._request = function(url) {
  var options = {
    url: url,
    headers: this.api_key
  };

  return new Promise(function (resolve, reject) {
    request(options, function(err, res, body) {
      if ( err ) {
        return reject(err, res, body);
      }
      return resolve(res, body);
    });
  });
};

module.exports = function(analyzers) {
  analyzers.aylien = AylienAnalyzer;
}
