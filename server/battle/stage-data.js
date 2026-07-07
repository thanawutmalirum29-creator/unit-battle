'use strict';
const path = require('path');

const { STAGES } = require(path.join(__dirname, '..', 'public', 'stages', 'n-stages.js'));
const { BOSSES } = require(path.join(__dirname, '..', 'public', 'js', 'modes', 'BOSS', 'bossmap.js'));

module.exports = { STAGES, BOSSES };
