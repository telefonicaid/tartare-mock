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

var extend = require('node.extend');

module.exports = function(collectionsGroup) {
  var configsCollection = collectionsGroup.createCollection('configs/');

  return {
    create: function create(config, cb) {
      var _config = config;
      // Encode body to Base64 when it is binary
      if (config.response.binaryBody && Buffer.isBuffer(config.response.body)) {
        _config = extend(true, {}, config);
        _config.response.body = config.response.body.toString('base64');
      }
      configsCollection.post(_config, cb);
    },
    read: function read(filter, cb) {
      if (!cb && filter instanceof Function) {
        cb = filter;
        filter = null;
      }
      configsCollection.get(filter, function(err, res) {
        if (err) {
          return cb(err);
        }
        if (res.statusCode !== 200) {
          var _err = new Error('Error reading configs from the mock server');
          _err.res = res;
          return cb(_err);
        }
        // Decode body from Base64 to Buffer when it is binary
        if (Array.isArray(res.json)) {
          res.json.forEach(function(config) {
            if (config.response.binaryBody) {
              config.response.body = new Buffer(config.response.body, 'base64');
            }
          });
        } else {
          if (res.json.response.binaryBody) {
            res.json.response.body = new Buffer(res.json.response.body, 'base64');
          }
        }
        cb(err, res);
      });
    },
    del: function del(filter, cb) {
      if (!cb && filter instanceof Function) {
        cb = filter;
        filter = null;
      }
      configsCollection.del(filter, cb);
    }
  };
};
