'use strict';

const crypto = require('crypto');
const request = require('request');
const _ = require('lodash');

/**
 * @module request-cache
 * @example
```js
const requestCache = require('request-cache');
const rCache = requestCache(REDIS_CLIENT);
const cacheKey;

setInterval(function () {
  const key = rCache('http://www.somethingawesome.com', function (err, resp, body) {
    // Do something with the awesomeness
  });

  // First call - cacheKey is undefined; resp and body are cached and returned
  // Second call - cacheKey === key; cached resp and body are returned
  // Third call - cacheKey === key; cached resp and body are returned
  // ...
  // Three-thousand-six-hundredth call - cacheKey === key; new resp and body are cached and returned

  cacheKey = key;
}, 1000);
```
*/

/**
 * @param {object} redisClient - an instance of a [redis client](https://github.com/mranney/node_redis)
 * @param {object} [options] - Options for cache management
 * @param {string} [options.algorithm=md5] - Any available system hashing algorithm to generate cache key ([more info](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm))
 * @param {string} [options.encoding=hex] - Encoding algorithm to use for encoding hashed cache key
 * @param {number} [options.ttl=3600] - Time in seconds for cache time-to-live
 * @param {number} [options.refresh=0] - Time in seconds to refresh time-to-live (this does not initiate a new request)
 * @param {array} [options.queryCacheKeys] - Query param keys to use for generating cache key
 * @param {string} [options.keyPrefix] - Prefix for generated cache keys
 * @return {function}
 */
module.exports = function requestCacheInitialization(redisClient, options) {
  options = _.assign({
    algorithm: 'md5',
    encoding: 'hex',
    refresh: 0, // seconds
    ttl: 3600, // seconds
    queryCacheKeys: [],
    keyPrefix: ''
  }, options || {});

  /**
   * Caches successful request calls for subsequent requests. If original request results in an error the response will not be cached.
   * @example
     ```js
     const cacheKey = rCache(req_obj[, key], next);
     ```
   * @param {object|string} req_obj - A request object or URL ([more info](https://github.com/request/request#requestoptions-callback))
   * @param {string} [key] - Cache key to use in place of the generated cache key
   * @param {function} next - callback function `next(err, resp, body)`
   * @return {string} - Generated cache key or provided key value
   */
  return function requestCache(reqObj, key, next) {
    if (arguments.length === 2) {
      // requestCache(reqObj, next);
      next = key;
      key = undefined;
    }

    if (_.isString(reqObj)) {
      // requestCache(URI[, key], next);
      reqObj = {uri: reqObj};
    }

    if (_.isEmpty(reqObj) || (_.isEmpty(reqObj.uri) && _.isEmpty(reqObj.url))) {
      return next ?
        process.nextTick(next, new TypeError('A URI or URL is required.')) :
        new TypeError('A URI or URL and a callback are required.');
    }

    if (key === undefined) {
      // Generate a key
      let hash = crypto.createHash(options.algorithm);

      hash.update(reqObj.uri || reqObj.url);

      options.queryCacheKeys.forEach(function addQeuryToHash(key) {
        if (_.has(reqObj.qs, key)) {
          hash.update(`${key}${reqObj.qs[key]}`);
        }
      });

      key = `${options.keyPrefix}${hash.digest(options.encoding)}`;
    }

    redisClient.get(key, function fetchObj(err, obj) {
      if (err) { return next(err); }

      if (obj) {
        // refresh expiration
        if (options.refresh) { redisClient.expire(key, options.refresh); }

        // reconstitute resp object and body
        return next.apply(null, [null].concat(JSON.parse(obj)));
      }

      // Fetch external API response if no cache or error
      request(reqObj, function response(err, resp, body) {
        if (err === null) {
          // Cache in redis
          redisClient.set(key, JSON.stringify([resp, body]));

          if (options.ttl) { redisClient.expire(key, options.ttl); }
        }

        return next(err, resp, body);
      });
    });

    // return `key` immediately
    return key;
  };
};
