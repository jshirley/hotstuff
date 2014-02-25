var Promise = require('es6-promise').Promise;
var htmlToText = require('html-to-text');

function KeywordAnalyzer(page) {
  this.page = page;
}

KeywordAnalyzer.prototype.process = function() {
  var page = this.page;

  if ( typeof page.keywords === 'undefined' ) {
    page.keywords = [];
  }

  return new Promise(function (resolve, reject) {
    return resolve({ text: htmlToText.fromString(page.body, { wordwrap: 130 }) });
  });
}

module.exports = function(analyzers) {
  analyzers.keywords = KeywordAnalyzer;
}
