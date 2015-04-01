var crypto = require('crypto');
var request = require('request');
var _ = require('lodash-node/modern');

module.exports = function requestCacheInitialization(redisClient, options) {
  options = _.assign({
    hashType: 'md5',
    refresh: 0, // seconds
    ttl: 3600, // seconds
    queryCacheKeys: [],
    keyPrefix: undefined
  }, options || {});

  // requestCache(reqObj[, key], next);
  return function requestCache(reqObj, key, next) {
    var hash;

    if (_.isString(reqObj)) {
      // requestCache(URI[, key], next);
      reqObj = {uri: reqObj};
    }

    if (arguments.length === 2) {
      // requestCache(req, next);
      next = key;
      key = undefined;
    }

    if (!reqObj || (!reqObj.url && !reqObj.uri)) {
      return next ?
        next(new TypeError('A URI or URL is required.')) :
        new TypeError('A URI or URL and a callback are required.');
    }

    if (key === undefined) {
      // Generate a key
      hash = crypto.createHash(options.hashType);
      hash.update(reqObj.url || reqObj.uri);

      if (reqObj.qs) {
        hash.update(options.queryCacheKeys.reduce(function (str, key) {
          if (reqObj.qs[key]) {
            str += key + reqObj.qs[key];
          }

          return str;
        }, ''));
      }

      key = (options.keyPrefix || '') + hash.digest('hex');
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
