#!/usr/bin/env node

'use strict';

var Hotstuff = require('./lib/hotstuff');

Hotstuff.initialize()
  .then(Hotstuff.analyze.bind(Hotstuff))
  .then(Hotstuff.exit)
  .catch(function(err) {
    console.log(err);
    Hotstuff.exit();
  });
