'use strict';
const { sendResponse, errReturned } = require('./lib/utils/dto');
const { EResponseCode } = require('./lib/utils/enum');

const { HOST, PORT,SESS_SECRET } = require("./config/config");

module.exports = (app) => {
  app.use('/api/users', require('./api/users'));
  app.use( '/api/auth', require( './api/authentication' ) );
  app.use('/api/teams', require('./api/team'));
  app.use('/api/campaign', require('./api/campaign'));
  app.use('/api/location', require('./api/location'));
  app.use('/api/survey', require('./api/survey'));

  app.use('/api/district', require('./api/district'));
  app.use('/api/division', require('./api/division'));
  app.use('/api/tehsil', require('./api/tehsil'));
  app.use('/api/uc', require('./api/uc'));
  app.use('/api/attendance', require('./api/attendance'));




  
};


