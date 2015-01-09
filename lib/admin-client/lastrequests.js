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

module.exports = function(collectionsGroup) {
  var lastRequestsCollection = collectionsGroup.createCollection('lastrequests/');

  return {
    read: function read(filter, cb) {
      if (!cb && filter instanceof Function) {
        cb = filter;
        filter = null;
      }
      lastRequestsCollection.get(filter, function(err, res) {
        if (err) {
          return cb(err);
        }
        if (res.statusCode !== 200) {
          var _err = new Error('Error reading last requests from the mock server');
          _err.res = res;
          return cb(_err);
        }

        res.json.forEach(function(lastRequest) {
          // Convert the timestamp to a javascript Date object
          lastRequest.timestamp = new Date(lastRequest.timestamp);
          // Decode body from Base64 to Buffer when it is binary
          if (lastRequest.binaryBody) {
            lastRequest.body = new Buffer(lastRequest.body, 'base64');
          }
        });
        cb(err, res);
      });
    },
    del: function del(filter, cb) {
      if (!cb && filter instanceof Function) {
        cb = filter;
        filter = null;
      }
      lastRequestsCollection.del(filter, cb);
    }
  }
};
