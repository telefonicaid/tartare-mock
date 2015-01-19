/*

 Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U

 This file is part of Tartare.

 Tartare is free software: you can redistribute it and/or modify it under the
 terms of the Apache License as published by the Apache Software Foundation,
 either version 2.0 of the License, or (at your option) any later version.
 Tartare is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 See the Apache License for more details.

 You should have received a copy of the Apache License along with Tartare.
 If not, see http://www.apache.org/licenses/LICENSE-2.0

 For those usages not covered by the Apache License please contact with:
 joseantonio.rodriguezfernandez@telefonica.com

 */

'use strict';

var _ = require('underscore'),
    http = require('http'),
    https = require('https'),
    express = require('express'),
    Datastore = require('nedb');

var DEFAULT_TIMEOUT = 2 * 60 * 1000;  // Default timeout to maintain open a connection (keep-alive)

var MockServer = function MockServer(settings) {
  this.settings = settings;
  this.servers = {};
  this.connections = {};
  this.context = {
    timeout: settings.timeout || DEFAULT_TIMEOUT,
    configs: new Datastore(),
    lastRequests: new Datastore(),
    DEFAULT_DELAY: 100
  };
  this.context.configs.ensureIndex({fieldName: 'method'});
  this.context.configs.ensureIndex({fieldName: 'path'});
  this.context.lastRequests.ensureIndex({fieldName: 'method'});
  this.context.lastRequests.ensureIndex({fieldName: 'path'});

  this.middlewares = require('./middlewares')(this.context);

  /****************
   *  ADMIN APP   *
   ****************/
  var adminApp = null;
  if (this.settings.admin) {
    adminApp = express();
    var basePath = '/admin/v1';
    var configsBasePath = basePath + '/configs';
    var timeoutBasePath = basePath + '/timeout';
    var lastRequestsBasePath = basePath + '/lastrequests';

    adminApp.set('port', settings.admin.port);
    // Assume json content when not Content-Type header available
    adminApp.use(this.middlewares.defaultJsonContentType);
    // Only accept and return JSON documents
    adminApp.use(this.middlewares.ensureJson);
    adminApp.use(express.bodyParser({limit: '50mb'}));
    adminApp.use(adminApp.router);
    adminApp.use(this.middlewares.errorHandler);

    // Create a new config
    adminApp.post(configsBasePath, this.middlewares.admin.configs.create);
    // Read configs
    adminApp.get(configsBasePath + '/:id', this.middlewares.admin.configs.readResource);
    adminApp.get(configsBasePath, this.middlewares.admin.configs.readCollection);
    // Delete configs
    adminApp.delete(configsBasePath + '/:id', this.middlewares.admin.configs.deleteResource);
    adminApp.delete(configsBasePath, this.middlewares.admin.configs.deleteCollection);

    // Modify server timeout for new connections
    adminApp.put(timeoutBasePath, this.middlewares.admin.timeout.update);
    // Read server timeout
    adminApp.get(timeoutBasePath, this.middlewares.admin.timeout.read);

    // Read last requests
    adminApp.get(lastRequestsBasePath, this.middlewares.admin.lastRequests.readCollection);
    // Delete last requests
    adminApp.delete(lastRequestsBasePath, this.middlewares.admin.lastRequests.deleteCollection);
  }
  this.adminApp = adminApp;
};

MockServer.prototype.start = function start(cb) {
  var self = this;

  function setSocketTimeout(conn) {
    conn.setTimeout(self.context.timeout);
  }

  // Save each connection to be destroyed later at server close time
  function registerConnection(conn) {
    var key = conn.remoteAddress + ':' + conn.remotePort;
    self.connections[key] = conn;
    conn.on('close', function onConnClose() {
      delete self.connections[key];
    });
  }

  function handleError(server, err) {
    err.serverName = server.name;
    self.stop(function() {
      cb(err);
    });
  }

  function onListening(server) {
    server.listening = true;
    server.closed = false;
    var allListening = _.reduce(self.servers, function(memo, srv) {
      return memo && srv.listening;
    }, true);

    if (allListening) {
      cb();
    }
  }

  if (!self.settings.http && !self.settings.https && !self.settings.twoWaySsl) {
    return cb(new Error('There is not any server configured'));
  }

  // Create the servers
  if (self.settings.admin) {
    self.servers.admin = http.createServer(self.adminApp);
    self.servers.admin.name = 'Admin';
    self.servers.admin.port = self.settings.admin.port;
  }
  if (self.settings.http) {
    self.servers.http = http.createServer(self.middlewares.mock.requestHandler)
        .on('connection', setSocketTimeout);
    self.servers.http.name = 'HTTP';
    self.servers.http.port = self.settings.http.port;
  }
  if (self.settings.https) {
    var optsHttps = {
      key: self.settings.https.key,
      cert: self.settings.https.cert
    };
    self.servers.https = https.createServer(optsHttps, self.middlewares.mock.requestHandler)
        .on('connection', setSocketTimeout);
    self.servers.https.name = 'HTTPS';
    self.servers.https.port = self.settings.https.port;
  }
  if (self.settings.twoWaySsl) {
    var optsTwoWaySsl = {
      key: self.settings.twoWaySsl.key,
      cert: self.settings.twoWaySsl.cert,
      ca: self.settings.twoWaySsl.ca,
      requestCert: true,
      rejectUnauthorized: true
    };
    self.servers.twoWaySsl = https.createServer(optsTwoWaySsl, self.middlewares.mock.requestHandler)
        .on('connection', setSocketTimeout);
    self.servers.twoWaySsl.name = '2waySSL';
    self.servers.twoWaySsl.port = self.settings.twoWaySsl.port;
  }

  // Add common properties and listeners to the created servers, and start them
  _.each(self.servers, function(server) {
    server.listening = false;
    server.closed = true;
    server
        .on('error', handleError.bind(self, server))
        .on('connection', registerConnection)
        .on('listening', onListening.bind(self, server))
        .listen(server.port);
  });
};

MockServer.prototype.stop = function stop(cb) {
  var self = this,
      waitingForClose = false;

  function onClose(server) {
    server.closed = true;
    var allClosed = _.reduce(self.servers, function(memo, srv) {
      return memo && srv.closed;
    }, true);

    if (allClosed) {
      self.servers = {};
      cb();
    }
  }

  _.each(self.servers, function(server) {
    if (server.listening) {
      waitingForClose = true;
      server.close(onClose.bind(self, server));
      server.listening = false;
    }
    // Destroy all the connections so the servers can be closed
    _.each(self.connections, function(conn) {
      conn.destroy();
    });
  });

  if (!waitingForClose) {
    cb();
  }
};

module.exports = MockServer;
