var expect = require('chai').expect;
var sinon = require('sinon');
var appRoot = require('app-root-path');
var logger = require(appRoot + '/logger.js');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

const waitTime = 10;

describe('clarify-logger', function () {
  var logFile = path.join(logger.transports['logfile'].dirname,
    logger.transports['logfile'].filename);
  var sinonSandbox;
  var logSpy;

  beforeEach(function (done) {
    fs.unlinkAsync(logFile).catch(function () {}).then(done);
    sinonSandbox = sinon.fakeServer.create();
    logSpy = sinon.spy();
  });

  afterEach(function (done) {
    fs.unlinkAsync(logFile).catch(function () {}).then(done);
    sinonSandbox.restore();
  });

  it('should log basic log level and message', function (done) {
    logger.debug('test log', logSpy);
    setTimeout(function () {
      expect(logSpy.calledOnce).to.be.true;
      expect(logSpy.getCall(0).args[1]).to.equal('debug');
      expect(logSpy.getCall(0).args[2]).to.equal('test log');
      done();
    }, waitTime);
  });

  it('should log standard metadata', function (done) {
    logger.debug('test log', logSpy);
    setTimeout(function () {
      expect(logSpy.calledOnce).to.be.true;
      expect(logSpy.getCall(0).args[3]).to.be.an('object');
      // expect(logSpy.getCall(0).args[3]).to.have.property('env');
      // expect(logSpy.getCall(0).args[3].env).to.equal('development');
      // expect(logSpy.getCall(0).args[3]).to.have.property('pid');
      // expect(logSpy.getCall(0).args[3].pid).to.be.an('number');
      // expect(logSpy.getCall(0).args[3]).to.have.property('memory');
      done();
    }, waitTime);
  });

  it('should support string interpolation', function (done) {
    logger.debug('test log string: %s, number: %d', 'TEST_STRING',
      12345, logSpy);
    setTimeout(function () {
      expect(logSpy.calledOnce).to.be.true;
      expect(logSpy.getCall(0).args[2]).to.equal(
        'test log string: TEST_STRING, number: 12345');
      done();
    }, waitTime);
  });

  it('should accept and merge additional metadata', function (done) {
    logger.debug('test log', {
      'providerId': 123,
      'patient': {
        'id': 456,
        'status': 'active'
      }
    }, logSpy);
    setTimeout(function () {
      expect(logSpy.calledOnce).to.be.true;
      expect(logSpy.getCall(0).args[3]).to.be.an('object');
      // expect(logSpy.getCall(0).args[3]).to.have.property('env');
      // expect(logSpy.getCall(0).args[3].env).to.equal('development');
      // expect(logSpy.getCall(0).args[3]).to.have.property('pid');
      // expect(logSpy.getCall(0).args[3].pid).to.be.an('number');
      // expect(logSpy.getCall(0).args[3]).to.have.property('memory');

      expect(logSpy.getCall(0).args[3]).to.have.property(
        'providerId');
      expect(logSpy.getCall(0).args[3].providerId).to.be.an(
        'number');
      expect(logSpy.getCall(0).args[3]).to.have.property('patient');
      expect(logSpy.getCall(0).args[3].patient).to.be.an('object');
      done();
    }, waitTime);
  });
});
