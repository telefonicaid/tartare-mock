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

var _ = require('underscore')
  , path = require('path')
  , cp = require('child_process')
  ;


/**
 * Run an instance of the Mock Server.
 * @param settings Startup settings for the mock:
 *                 - admin: Administration server options:
 *                   - port: Administration port.
 *                 - http: HTTP server options:
 *                   - port: HTTP port.
 *                 - https: HTTPS server options:
 *                   - port: HTTPS port.
 *                   - key: Key file used to run the HTTPS server.
 *                   - cert: Cert file used to run the HTTPS server.
 *                 - twoWaySsl: 2waySSL server options:
 *                   - port: 2waySSL port.
 *                   - key: Key file used to run the 2waySSL server.
 *                   - cert: Cert file used to run the 2waySSL server.
 *                   - ca: CA file used to run the 2waySSL server.
 *                 - timeout: Default response timeout.
 * @param timeout Max time to wait for the Mock Server to start before returning an error.
 * @param cb
 */
var runServer = function runServer(settings, timeout, cb) {
  if (!cb && (timeout instanceof Function)) {
    cb = timeout;
    timeout = null;
  }
  timeout = timeout || 5000;

  var args = [];
  if (settings.admin && settings.admin.port) {
    args.push('-a', settings.admin.port);
  }
  if (settings.http && settings.http.port) {
    args.push('-p', settings.http.port);
  }
  if (settings.https && settings.https.port) {
    args.push('-s', settings.https.port);
    if (settings.https.key) {
      args.push('-k', settings.https.key);
    }
    if (settings.https.cert) {
      args.push('-c', settings.https.cert);
    }
  }
  if (settings.twoWaySsl && settings.twoWaySsl.port) {
    args.push('-2', settings.twoWaySsl.port);
    if (settings.twoWaySsl.key) {
      args.push('-k', settings.twoWaySsl.key);
    }
    if (settings.twoWaySsl.cert) {
      args.push('-c', settings.twoWaySsl.cert);
    }
    if (settings.twoWaySsl.ca) {
      args.push('-w', settings.twoWaySsl.ca);
    }
  }
  if (settings.timeout) {
    args.push('-t', settings.timeout);
  }

  var mockProcess = cp.fork(path.resolve(__dirname, '../bin/mock'), args, { silent: true });

  var stderr = '',
      stdout = '';

  var listening = {
    admin: false
  };
  if (settings.http && settings.http.port) {
    listening.http = false;
  }
  if (settings.https && settings.https.port) {
    listening.https = false;
  }
  if (settings.twoWaySsl && settings.twoWaySsl.port) {
    listening.twoWaySsl = false;
  }

  var timeoutId = setTimeout(function() {
    // Just in case the mock server does not start properly after some time
    mockProcess.stdout.removeAllListeners('data');
    mockProcess.kill();
    var err = new Error('Mock Server couldn\'t be started before ' + timeout + ' milliseconds');
    err.stderr = stderr;
    err.stdout = stdout;
    cb(err);
  }, timeout);

  mockProcess.on('error', function(err) {
    cb(err);
  });
  mockProcess.on('exit', function(code, signal) {
    if (/*code !== 0 &&*/ code !== 143) {
      var err = new Error('Mock Server Error');
      err.stderr = stderr;
      cb(err);
    }
  });
  mockProcess.stderr.on('data', function(chunk) {
    stderr += chunk.toString();
  });
  mockProcess.stdout.on('data', function(chunk) {
    stdout += chunk.toString();
    // Look for each server to have been started
    for (var server in listening) {
      if (listening.hasOwnProperty(server)) {
        listening[server] = (stdout.indexOf('listening on port ' + settings[server].port) !== -1);
      }
    }
    if (_.reduce(listening, function(memo, value) { return memo && value; }, true)) {
      // If all servers have been started
      clearTimeout(timeoutId);
      mockProcess.stdout.removeAllListeners('data');
      mockProcess.stderr.removeAllListeners('data');
      cb(null, mockProcess.pid);
    }
  });
};

var stopServer = function stopServer(pid) {
  try {
    if (pid) {
      process.kill(pid);
    }
  } catch(err) {
    // Already killed
  }
};


module.exports = {
  runServer: runServer,
  stopServer: stopServer
};
