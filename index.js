/*

 Copyright 2018 Telefonica Investigación y Desarrollo, S.A.U

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

var Server = require('./lib/server'),
    AdminClient = require('./lib/admin-client'),
    util = require('./lib/util');

module.exports = {
  createServer: function createServer(settings) {
    return new Server(settings);
  },
  createAdminClient: function createAdminClient(hostname, adminPort) {
    return new AdminClient({
      baseUrl: 'http://' + hostname + ':' + adminPort + '/admin/v1'
    });
  },
  runServer: util.runServer,
  stopServer: util.stopServer
};
