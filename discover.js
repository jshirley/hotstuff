#!/usr/bin/env node

'use strict';

var Hotstuff = require('./lib/hotstuff');

Hotstuff.initialize()
  .then( function() {
    Hotstuff.fetchPagesFromConfig(Hotstuff.config.categories)
    .then(
      function(entities) {
        Hotstuff.logger.info("Fetched " + entities.length + " pages to process");
        Hotstuff.exit();
      },
      function(reason) {
        Hotstuff.logger.error("Error fetching new pages from configuration");
        Hotstuff.logger.error(reason);
        Hotstuff.exit();
      }
    );
  });
