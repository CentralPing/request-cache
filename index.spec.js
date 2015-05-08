'use strict';
/* jshint node: true, jasmine: true */

var reqCache = require('./');

describe('With request-cache', function () {
  it('should return a function on require', function () {
    expect(reqCache).toEqual(jasmine.any(Function));
    expect(reqCache.name).toBe('requestCacheInitialization');
  });

  it('should return a function on intitialization', function () {
    var cacheObj = reqCache();

    expect(cacheObj).toEqual(jasmine.any(Function));
    expect(cacheObj.name).toBe('requestCache');
  });

  describe('with caching function', function () {
    var redis;
    var cache;
    var next;
    var hashKey;

    beforeAll(function() {
      redis = jasmine.createSpyObj('redis', ['get', 'set', 'expire']);
      next = jasmine.createSpy('next');
      cache = reqCache(redis);
    });

    afterEach(function () {
      redis.get.calls.reset();
      redis.set.calls.reset();
      redis.expire.calls.reset();
      next.calls.reset();
    });

    it('should return an error without required fields: URI and callback', function () {
      var hashKey = cache();
      expect(hashKey).not.toBe(null);
      expect(hashKey.name).toBe('TypeError');
      expect(hashKey.message).toBe('A URI or URL and a callback are required.');
      expect(redis.get).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
      expect(redis.expire).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should populate callback error without required field: URI', function (done) {
      next.and.callFake(function (err, resp, body) {
        expect(hashKey).not.toBeDefined();
        expect(redis.get).not.toHaveBeenCalled();
        expect(redis.set).not.toHaveBeenCalled();
        expect(redis.expire).not.toHaveBeenCalled();
        expect(err).not.toBe(null);
        expect(err.name).toBe('TypeError');
        expect(err.message).toBe('A URI or URL is required.');
        done();
      });
      var hashKey = cache({}, next);
    });

    it('should return a hash immediately', function (done) {
      redis.get.and.callFake(function (key, cb) {
        process.nextTick(function() { cb(null); });
      });
      next.and.callFake(function (err, resp, body) {
        expect(hashKey).toBeDefined();
        expect(hashKey).toEqual(jasmine.any(String));
        done();
      });
      var hashKey = cache('http://localhost', next);
    });

    it('should use the hashKey for lookup', function (done) {
      redis.get.and.callFake(function (key, cb) {
        process.nextTick(function() { cb(null); });
      });
      next.and.callFake(function (err, resp, body) {
        expect(err).not.toBe(null);
        expect(resp).not.toBeDefined();
        expect(body).not.toBeDefined();
        expect(redis.get).toHaveBeenCalled();
        expect(redis.get.calls.argsFor(0)[0]).toBe(hashKey);
        expect(redis.get.calls.argsFor(0)[1]).toEqual(jasmine.any(Function));
        expect(redis.set).not.toHaveBeenCalled();
        expect(redis.expire).not.toHaveBeenCalled();
        done();
      });
      var hashKey = cache('http://localhost', next);
    });

    describe('with cache lookup', function () {
      it('should populate error on callback if lookup fails', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(new Error('Error Message')); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(err).not.toBe(null);
          expect(err.name).toBe('Error');
          expect(err.message).toBe('Error Message');
          expect(resp).not.toBeDefined();
          expect(body).not.toBeDefined();
          expect(redis.get).toHaveBeenCalled();
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
        var hashKey = cache('http://localhost', next);
      });

      it('should return parsed cache object if lookup matches', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null, '[{},"body"]'); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp).toEqual({});
          expect(body).toBe('body');
          expect(redis.get).toHaveBeenCalled();
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
        var hashKey = cache('http://localhost', next);
      });
    });

    describe('with requests', function () {
      var cacheObj = {};

      it('should return error without caching', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(err).not.toBe(null);
          expect(err.name).toBe('Error');
          expect(err.message).toBe('connect ECONNREFUSED');
          expect(resp).not.toBeDefined();
          expect(body).not.toBeDefined();
          expect(redis.get).toHaveBeenCalled();
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
        var hashKey = cache('http://localhost', next);
      });

      it('should use the hashKey for setting and expiring cache', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp).toBeDefined();
          expect(body).toBeDefined();
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
        var hashKey = cache('http://www.google.com', next);
      });

      it('should generate the same hashKey for retreiving cache with the same URL', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
        var hashKey = cache('http://www.google.com', next);
      });

      it('should generate the same hashKey for retreiving cache with the same URL as a param (URL)', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
        var hashKey = cache({url: 'http://www.google.com'}, next);
      });

      it('should generate the same hashKey for retreiving cache with the same URL as a param (URI)', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
        var hashKey = cache({uri: 'http://www.google.com'}, next);
      });

      it('should generate a new hashKey for retreiving cache with a different URL', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).not.toBe(cacheObj.key);
          done();
        });
        var hashKey = cache('http://google.com', next);
      });

      it('should generate the same hashKey for retreiving cache with same URL and query params', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).not.toBe(cacheObj.key);
          done();
        });
        var hashKey = cache('http://google.com/?q=hello', next);
      });

      it('should parse the cached value without initiating a new request', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null, cacheObj.value); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp.statusCode).toBe(cacheObj.resp.statusCode);
          expect(body).toEqual(cacheObj.body);
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });
        var hashKey = cache('http://www.google.com', next);
      });
    });
  });

  describe('with caching options', function () {
    var redis;
    var cache;
    var next;
    var hashKey;

    beforeAll(function() {
      redis = jasmine.createSpyObj('redis', ['get', 'set', 'expire']);
      next = jasmine.createSpy('next');
      cache = reqCache(redis, {ttl: 10, queryCacheKeys: ['q', 'spell']});
    });

    afterEach(function () {
      redis.get.calls.reset();
      redis.set.calls.reset();
      redis.expire.calls.reset();
      next.calls.reset();
    });

    describe('with requests', function () {
      var cacheObj = {};

      it('should use the hashKey for setting and expiring cache', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
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
        var hashKey = cache({url: 'http://www.google.com', qs: {q: 'hello', spell: 1}}, next);
      });

      it('should generate the same hashKey for retreiving cache with the same URL and key param values', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
        var hashKey = cache({url: 'http://www.google.com', qs: {q: 'hello', spell: 1}}, next);
      });

      it('should generate the same hashKey for retreiving cache with the same URL and key param values with extra param values', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).toBe(cacheObj.key);
          done();
        });
        var hashKey = cache({url: 'http://www.google.com', qs: {q: 'hello', spell: 1, sa: 'foo'}}, next);
      });

      it('should generate a new hashKey for retreiving cache with the same URL and different key param values', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).not.toBe(cacheObj.key);
          done();
        });
        var hashKey = cache({url: 'http://www.google.com', qs: {q: 'hello', spell: 0}}, next);
      });

      it('should generate a new hashKey for retreiving cache with the same URL and subset of key param values', function (done) {
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).not.toBe(cacheObj.key);
          done();
        });
        var hashKey = cache({url: 'http://www.google.com', qs: {q: 'hello'}}, next);
      });

      it('should refresh the expiration with `refresh` set to a positive value', function (done) {
        cache = reqCache(redis, {refresh: 10});
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null, cacheObj.value); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp.statusCode).toBe(cacheObj.resp.statusCode);
          expect(body).toEqual(cacheObj.body);
          expect(redis.set).not.toHaveBeenCalled();
          expect(redis.expire).toHaveBeenCalled();
          expect(redis.expire.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.expire.calls.argsFor(0)[1]).toEqual(10);
          done();
        });

        var hashKey = cache('http://www.google.com', next);
      });

      it('should not set the expiration with `ttl` set to `0`', function (done) {
        cache = reqCache(redis, {ttl: 0});
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(err).toBe(null);
          expect(resp).toBeDefined();
          expect(body).toBeDefined();
          expect(redis.set).toHaveBeenCalled();
          expect(redis.set.calls.argsFor(0)[0]).toBe(hashKey);
          expect(redis.set.calls.argsFor(0)[1]).toEqual(jasmine.any(String));
          expect(redis.expire).not.toHaveBeenCalled();
          done();
        });

        var hashKey = cache('http://www.google.com', next);
      });

      it('should prefix the generated hashKey with `keyPrefix` set', function (done) {
        cache = reqCache(redis, {keyPrefix: 'FOO'});
        redis.get.and.callFake(function (key, cb) {
          process.nextTick(function() { cb(null); });
        });
        next.and.callFake(function (err, resp, body) {
          expect(hashKey).toBeDefined();
          expect(hashKey).toEqual(jasmine.stringMatching(/^FOO/));
          done();
        });
        var hashKey = cache('http://localhost', next);
      });
    });
  });
});
