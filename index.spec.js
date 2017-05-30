'use strict';

const url = require('url');
const mockery = require('mockery');

describe('With request-cache', function () {
  let reqCache;

  beforeAll(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    mockery.registerMock('request', function mockRequest(reqObj, next) {
      const urlObj = url.parse(reqObj.uri || reqObj.url);

      if (urlObj.pathname === '/error') {
        return next(new Error('ERROR'));
      }

      next(null, {}, 'body');
    });

    reqCache = require('./');
  });

  afterAll(function () {
    mockery.disable();
    mockery.deregisterAll();
  });

  describe('with exports', function () {
    it('should return a function on require', function () {
      expect(reqCache).toEqual(jasmine.any(Function));
      expect(reqCache.name).toBe('requestCacheInitialization');
    });

    it('should return a function on intitialization', function () {
      const cacheObj = reqCache();

      expect(cacheObj).toEqual(jasmine.any(Function));
      expect(cacheObj.name).toBe('requestCache');
    });
  });

  describe('with default caching options', function () {
    let redis;
    let cache;

    beforeAll(function() {
      redis = jasmine.createSpyObj('redis', ['get', 'set', 'expire']);
      cache = reqCache(redis);
    });

    beforeEach(function () {
      redis.get.calls.reset();
      redis.set.calls.reset();
      redis.expire.calls.reset();

      redis.get.and.callFake(function (key, cb) {
        process.nextTick(cb, null);
      });
    });

    describe('with errors', function () {
      it('should return an error without required fields: URI and callback', function () {
        const hashKey = cache();

        expect(hashKey).not.toBe(null);
        expect(hashKey.name).toBe('TypeError');
        expect(hashKey.message).toBe('A URI or URL and a callback are required.');
        expect(redis.get).not.toHaveBeenCalled();
        expect(redis.set).not.toHaveBeenCalled();
        expect(redis.expire).not.toHaveBeenCalled();
      });

      it('should populate callback error without required field: URI', function (done) {
        const hashKey = cache({}, function (err, resp, body) {
          expect(hashKey).not.toBeDefined();
          expect(redis.get).not.toHaveBeenCalled();
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          expect(err).not.toBe(null);
          expect(err.name).toBe('TypeError');
          expect(err.message).toBe('A URI or URL is required.');
          done();
        });
      });
    });

    describe('with cache lookup', function () {
      it('should populate error on callback if lookup fails', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(cb, new Error('Error Message'));
        });

        const hashKey = cache('http://localhost', function (err, resp, body) {
          expect(err).not.toBe(null);
          expect(err.name).toBe('Error');
          expect(err.message).toBe('Error Message');
          expect(resp).not.toBeDefined();
          expect(body).not.toBeDefined();
          expect(redis.get).toHaveBeenCalled();
          expect(redis.get.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.get.calls.argsFor(0)[1]).toEqual(jasmine.any(Function));
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
      });

      it('should return parsed cache object if lookup matches', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(cb, null, '[{},"body"]');
        });

        const hashKey = cache('http://localhost', function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp).toEqual({});
          expect(body).toBe('body');
          expect(redis.get).toHaveBeenCalled();
          expect(redis.get.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.get.calls.argsFor(0)[1]).toEqual(jasmine.any(Function));
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('with requests', function () {
      var cacheObj = {};

      it('should return error without caching', function (done) {
        const hashKey = cache('http://localhost/error', function (err, resp, body) {
          expect(err).not.toBe(null);
          expect(err.name).toBe('Error');
          expect(err.message).toBe('ERROR');
          expect(resp).not.toBeDefined();
          expect(body).not.toBeDefined();
          expect(redis.get).toHaveBeenCalled();
          expect(redis.get.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.get.calls.argsFor(0)[1]).toEqual(jasmine.any(Function));
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
      });

      it('should use the hashKey for setting and expiring cache', function (done) {
        const hashKey = cache('http://localhost', function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp).toBeDefined();
          expect(body).toBeDefined();
          expect(redis.get).toHaveBeenCalled();
          expect(redis.get.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.get.calls.argsFor(0)[1]).toEqual(jasmine.any(Function));
          expect(redis.set).toHaveBeenCalled();
          expect(redis.set.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.set.calls.argsFor(0)[1]).toEqual(jasmine.any(String));
          expect(redis.expire).toHaveBeenCalled();
          expect(redis.expire.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.expire.calls.argsFor(0)[1]).toEqual(3600);

          cacheObj.key = hashKey;
          cacheObj.value = redis.set.calls.argsFor(0)[1];
          cacheObj.resp = resp;
          cacheObj.body = body;

          done();
        });
      });

      it('should generate the same hashKey for retreiving cache with the same URL', function (done) {
        const hashKey = cache('http://localhost', function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
      });

      it('should generate the same hashKey for retreiving cache with the same URL as a param (URL)', function (done) {
        const hashKey = cache({url: 'http://localhost'}, function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
      });

      it('should generate the same hashKey for retreiving cache with the same URL as a param (URI)', function (done) {
        const hashKey = cache({uri: 'http://localhost'}, function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
      });

      it('should generate a new hashKey for retreiving cache with a different URL', function (done) {
        const hashKey = cache('https://localhost', function (err, resp, body) {
          expect(hashKey).not.toBe(cacheObj.key);
          done();
        });
      });

      it('should generate the same hashKey for retreiving cache with same URL and query params', function (done) {
        const hashKey = cache('http://localhost/?q=hello', function (err, resp, body) {
          expect(hashKey).not.toBe(cacheObj.key);
          done();
        });
      });

      it('should parse the cached value without initiating a new request', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(cb, null, cacheObj.value);
        });

        const hashKey = cache('http://localhost', function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp.statusCode).toBe(cacheObj.resp.statusCode);
          expect(body).toEqual(cacheObj.body);
          expect(redis.get).toHaveBeenCalled();
          expect(redis.get.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.get.calls.argsFor(0)[1]).toEqual(jasmine.any(Function));
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('with caching options', function () {
    let redis;
    let cache;

    beforeAll(function() {
      redis = jasmine.createSpyObj('redis', ['get', 'set', 'expire']);
      cache = reqCache(redis, {ttl: 10, queryCacheKeys: ['q', 'spell']});
    });

    beforeEach(function () {
      redis.get.calls.reset();
      redis.set.calls.reset();
      redis.expire.calls.reset();

      redis.get.and.callFake(function (key, cb) {
        process.nextTick(cb, null);
      });
    });

    describe('with requests', function () {
      const cacheObj = {};

      it('should use the hashKey for setting and expiring cache', function (done) {
        const hashKey = cache({url: 'http://localhost', qs: {q: 'hello', spell: 1}}, function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp).toBeDefined();
          expect(body).toBeDefined();
          expect(redis.set).toHaveBeenCalled();
          expect(redis.set.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.set.calls.argsFor(0)[1]).toEqual(jasmine.any(String));
          expect(redis.expire).toHaveBeenCalled();
          expect(redis.expire.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.expire.calls.argsFor(0)[1]).toEqual(10);

          cacheObj.key = hashKey;
          cacheObj.value = redis.set.calls.argsFor(0)[1];
          cacheObj.resp = resp;
          cacheObj.body = body;

          done();
        });
      });

      it('should generate the same hashKey for retreiving cache with the same URL and key param values', function (done) {
        const hashKey = cache({url: 'http://localhost', qs: {q: 'hello', spell: 1}}, function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);

          done();
        });
      });

      it('should generate the same hashKey for retreiving cache with the same URL and key param values with extra param values', function (done) {
        const hashKey = cache({url: 'http://localhost', qs: {q: 'hello', spell: 1, sa: 'foo'}}, function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
      });

      it('should generate a new hashKey for retreiving cache with the same URL and different key param values', function (done) {
        const hashKey = cache({url: 'http://localhost', qs: {q: 'hello', spell: 0}}, function (err, resp, body) {
          expect(hashKey).not.toBe(cacheObj.key);
          done();
        });
      });

      it('should generate a new hashKey for retreiving cache with the same URL and subset of key param values', function (done) {
        const hashKey = cache({url: 'http://localhost', qs: {q: 'hello'}}, function (err, resp, body) {
          expect(hashKey).not.toBe(cacheObj.key);
          done();
        });
      });

      it('should refresh the expiration with `refresh` set to a positive value', function (done) {
        const cache = reqCache(redis, {refresh: 10});

        redis.get.and.callFake(function (key, cb) {
          process.nextTick(cb, null, cacheObj.value);
        });

        const hashKey = cache('http://localhost', function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp.statusCode).toBe(cacheObj.resp.statusCode);
          expect(body).toEqual(cacheObj.body);
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).toHaveBeenCalled();
          expect(redis.expire.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.expire.calls.argsFor(0)[1]).toEqual(10);
          done();
        });
      });

      it('should not set the expiration with `ttl` set to `0`', function (done) {
        const cache = reqCache(redis, {ttl: 0});

        const hashKey = cache('http://localhost', function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp).toBeDefined();
          expect(body).toBeDefined();
          expect(redis.set).toHaveBeenCalled();
          expect(redis.set.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.set.calls.argsFor(0)[1]).toEqual(jasmine.any(String));
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
      });

      it('should prefix the generated hashKey with `keyPrefix` set', function (done) {
        const cache = reqCache(redis, {keyPrefix: 'FOO'});

        const hashKey = cache('http://localhost', function (err, resp, body) {
          expect(hashKey).toBeDefined();
          expect(hashKey).toEqual(jasmine.stringMatching(/^FOO/));
          done();
        });
      });
    });
  });
});
