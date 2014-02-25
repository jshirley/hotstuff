#!/usr/bin/env node

'use strict';

var Hotstuff = require('./lib/hotstuff');

Hotstuff.initialize()
  .then(Hotstuff.fetchPendingPages.bind(Hotstuff))
  .then(Hotstuff.exit);
