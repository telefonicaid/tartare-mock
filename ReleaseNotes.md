# RELEASE NOTES

## v0.6.1 / 28 Apr 2015
* Fixed: When setting a new configuration and there are several 'last requests' for such a configuration, only one
  'last request' is removed.

## v0.6.0 / 13 Feb 2015
* Added support to use the mock programmatically. A mock instance can created using the `createServer` function
  and there are methods to `start` and `stop` the Mock.
```javascript
var tartareMock = require('tartare-mock');
var mock = tartareMock.createServer(settings);
mock.start(function(err) {
  console.log('Mock started');
  mock.stop(function() {
    console.log('Mock stopped');
  );
);
```

## v0.5.0 / 11 Jan 2015
* `tartare-mock` is born as an independent package. Previously its functionality was in the `tartare` package.
* `lastrequests` resource now include a timestamp for each received request and the list of last request is ordered
  by timestamp.

## v0.4.0 / 6 Nov 2014
* API Mock now supports 2waySSL. Write `apimockserver` without parameters to see how to use it. Last requests objects will
  include a new property named `certificate` that will convey the details of the certificate used by the client to establish
  the connection.
* Mock responses may include references to request body fields when the body can be parsed as JSON or XML. 
  XML bodies are converted to JSON using [xml2json](https://www.npmjs.org/package/xml2json).
  If the body can be parsed, it will be accessible through a `bodyJson` property.
 
```json
{
  "method": "POST",
  "path": "/",
  "response": {
    "statusCode": 200,
    "body": "Result: {{{bodyJson.fieldName}}}"
  }
}
```

## v0.3.0 / 7 Aug 2014
* Mock's last requests now include the remote client address (ip and port).
* A bug that prevented mocks from remembering more than one 'last request' has been fixed.
