var winston = require('winston');
var winstonGraylog = require('winston-graylog2');
var appRoot = require('app-root-path');
var config = require('config');
var util = require('util');
var fs = require('fs');
var os = require('os');
var path = require('path');
var cluster = require('cluster');
var moment = require('moment');
const crypto = require('crypto');
const _ = require('lodash');

const uuidEncryptionKey = process.env.UUID_ENCRYPTION_KEY;

function encrypt(text) {
  let cipher = crypto.createCipher('aes-256-cbc', uuidEncryptionKey);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `enc(${encrypted})`;
}

const formatRegExp = /%[sdj%]/g;

let lastMoment = moment();
let lastTimingDiffMS = 0;

winston.emitErrs = true;

var options = {
  consoleLogLevel: 'warn',
  fileLogLevel: 'debug',
  fileName: '/logs/logs.log',
  logToGraylog: false,
  graylogConfig: {
    host: '10.0.1.10',
    port: 12201
  },
  timestamp: (require('os').platform() === 'win32'),
  timing: false
};

if (config.has('clarify-logger')) {
  var appOptions = config.get('clarify-logger');
  options = config.util.extendDeep(options, appOptions);
}

var logDir = path.dirname(appRoot + options.fileName);
if (!fs.existsSync(logDir)) {
  // Create the directory if it does not exist
  fs.mkdirSync(logDir);
}

var transports = [];

if (options.consoleLogLevel) {
  transports.push(new winston.transports.Console({
    level: options.consoleLogLevel,
    handleExceptions: true,
    json: false,
    colorize: true,
    timestamp: options.timestamp && (() => {
      let differenceText = '';
      if (options.timing && lastTimingDiffMS) {
        if (lastTimingDiffMS < 1000) {
          differenceText = ` +${lastTimingDiffMS}ms`;
        } else {
          differenceText = ` +${(lastTimingDiffMS / 1000).toFixed(2)}s`;
        }
      }
      return `${moment().local().format('YYYY-MM-DD HH:mm:ss.SS')}${differenceText}` ; })
  }));
}

if (options.fileLogLevel) {
  transports.push(new winston.transports.File({
    name: 'logfile',
    level: options.fileLogLevel,
    filename: appRoot + options.fileName,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, //5MB
    maxFiles: 5,
    colorize: false
  }));
}

if (options.logToGraylog) {
  transports.push(new winstonGraylog({
    level: options.graylogLogLevel || options.fileLogLevel,
    handleExceptions: true,
    graylog: {
      servers: [{
        host: options.graylogConfig.host,
        port: 12201
      }],
      hostname: os.hostname(),
      bufferSize: 1400
    }
  }));
}

var logger = new winston.Logger({
  transports: transports,
  exitOnError: true
});

logger.on('error', err => {
  // internal winston problems 
  console.error('!error: ', err);
});


module.exports = logger;
module.exports.stream = {
  write: function (message, encoding) {
    logger.info(message);
  }
};

logger.log = function () {
  var args = Array.prototype.slice.call(arguments);

  if (uuidEncryptionKey) {
    args = args.map(a => {
      if (typeof a === 'string' || a instanceof String) {
        return a.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/igm, encrypt);
      } else {
        return a;
      }
    })
  }

  var standardMetadata = {
    // env: process.env.NODE_ENV || 'development',
    // pid: process.pid,
    // memory: process.memoryUsage()
  };

  if (options.timing) {
      let thisMoment = moment();
      lastTimingDiffMS = thisMoment.diff(lastMoment, 'ms');
      lastMoment = thisMoment;
      standardMetadata.msSinceLastLog = lastTimingDiffMS;
  }

  if (cluster.isWorker) {
    standardMetadata.workerId = cluster.worker.id;
  } else if (Object.keys(cluster.workers).length > 0) {
    standardMetadata.workerId = 0;
  }

  // remove the empty arguments at the end
  while (args[args.length - 1] === null) {
    args.pop();
  }

  // Borrowed from winston/lib/winston/logger.js
  // 
  // Determining what is `meta` and what are arguments for string interpolation
  // turns out to be VERY tricky. e.g. in the cases like this:
  //
  //    logger.info('No interpolation symbols', 'ok', 'why', { meta: 'is-this' });
  //
  var callback = typeof args[args.length - 1] === 'function' ? args.pop() :
    null;

  var metaType = Object.prototype.toString.call(args[args.length - 1]),
    fmtMatch = args[0] && args[0].match && args[0].match(formatRegExp),
    isFormat = fmtMatch && fmtMatch.length,
    validMeta = !isFormat ? metaType === '[object Object]' || metaType ===
    '[object Error]' || metaType === '[object Array]' : metaType ===
    '[object Object]',
    meta = validMeta ? args.pop() : {},
    msg = util.format.apply(null, args);

  // merge metadata parameter with standard metadata
  meta = config.util.extendDeep(meta, standardMetadata);

  // put metadata and callback back into the args
  args.push(meta, callback);

  return winston.Logger.prototype.log.apply(this, args);
};
