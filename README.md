# clarify-logger

Clarify-logger wraps the popular winston logger in order to provide a standard logger for all clarify projects.

## Installation

Clarify-logger is distributed from the Clarify sinopia NPM server. If you haven't already, you need to set your registry to our sinopia server:
```bashp
npm set registry http://ec2-52-32-108-176.us-west-2.compute.amazonaws.com:4873
```

```bashp
npm install --save clarify-logger
```

## Dependencies:
- [winston](https://github.com/winstonjs/winston/blob/master/README.md) - core logger
- [config](https://github.com/lorenwest/node-config/blob/master/README.md) - for log configuration
- [winston-graylog2](https://github.com/namshi/winston-graylog2/blob/master/readme.md) - for Graylog transport
- [app-root-path](https://github.com/inxilpro/node-app-root-path/blob/master/README.md) - because log file locations are relative to your node app root path.

## Usage:
```js
var logger = require('clarify-logger');

logger.info('text to log with format %d %s', someNumber, someString, someMetadataObject);
```

Other methods are:
logger.error, logger.debug, logger.warn

You can optionally call logger.log('error', ...) instead of logger.error(...).

The last optional parameter is a metadata javascript object that gets attached to the log. The clarify logger is by default set to include timestamp, process id, NODE_ENV, and process memory usage. If you pass in your own metadata object, it will be merged with the standard metadata.

## Configuration

Clarify logger uses the config module to manage configuration. The default configuration is:

```js
var options = {
  consoleLogLevel: 'warn',
  fileLogLevel: 'debug',
  fileName: '/logs/logs.log',
  logToGraylog: false,
  graylogConfig: {
    host: '10.0.1.10',
    port: 12201
  }
};
```

If you want to override these, you should create a default.json file under yourAppRoot/config. In default.json, you should create a 'clarify-logger' property and assign a set of options to it like this:

```js
{
  "clarify-logger": {
    "consoleLogLevel": "fatal",
    "fileLogLevel": "debug",
    "fileName": "/logs/test.log",
    "logToGraylog": false,
    "graylogConfig": {
      "host": "10.0.1.10",
      "port": 12201
    }
  }
}
```

The way the config module works, you'll use this default.json file to hold various sets of configurations. clarify-logger will live here with configurations for other modules that depend on the config module.

By default, logToGraylog is set to false. The winston-graylog2 module provides a transport that allows logging directly to a Graylog log aggregation & indexing server.