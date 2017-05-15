request-cache
====================

[![Build Status](https://travis-ci.org/CentralPing/request-cache.svg?branch=master)](https://travis-ci.org/CentralPing/request-cache)
[![Code Climate for CentralPing/request-cache](https://codeclimate.com/github/CentralPing/request-cache/badges/gpa.svg)](https://codeclimate.com/github/CentralPing/request-cache)
[![Dependency Status for CentralPing/request-cache](https://david-dm.org/CentralPing/request-cache.svg)](https://david-dm.org/CentralPing/request-cache)
[![Greenkeeper badge](https://badges.greenkeeper.io/CentralPing/request-cache.svg)](https://greenkeeper.io/)

Simple request caching using [Redis](http://redis.io/) for [request](https://github.com/request/request).

Tested with redis clients: [node_redis](https://github.com/mranney/node_redis) [ioredis](https://github.com/luin/ioredis)

## Installation

`npm i --save request-cache`

## API Reference
**Example**  
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
<a name="exp_module_request-cache--module.exports"></a>

### module.exports(redisClient, [options]) ⇒ <code>function</code> ⏏
**Kind**: Exported function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| redisClient | <code>object</code> |  | an instance of a [redis client](https://github.com/mranney/node_redis) |
| [options] | <code>object</code> |  | Options for cache management |
| [options.algorithm] | <code>string</code> | <code>&quot;md5&quot;</code> | Any available system hashing algorithm to generate cache key ([more info](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm)) |
| [options.encoding] | <code>string</code> | <code>&quot;hex&quot;</code> | Encoding algorithm to use for encoding hashed cache key |
| [options.ttl] | <code>number</code> | <code>3600</code> | Time in seconds for cache time-to-live |
| [options.refresh] | <code>number</code> | <code>0</code> | Time in seconds to refresh time-to-live (this does not initiate a new request) |
| [options.queryCacheKeys] | <code>array</code> |  | Query param keys to use for generating cache key |
| [options.keyPrefix] | <code>string</code> |  | Prefix for generated cache keys |


## Examples

### With Basic Requests
```js
const requestCache = require('request-cache');
const rCache = requestCache(REDIS_CLIENT);

const cacheKey = rCache('http://www.somethingawesome.com', function (err, resp, body) {
  // Do something with the awesomeness
});
```

### With Request Object
```js
const requestCache = require('request-cache');
const rCache = requestCache(REDIS_CLIENT);

const cacheKey = rCache({
  url:'http://www.somethingawesome.com',
}, function (err, resp, body) {
  // Do something with the awesomeness
});
```

### With Cache Key Options
```js
const requestCache = require('request-cache');
const rCache = requestCache(REDIS_CLIENT, {
  queryCacheKeys: ['foo']
});

const cacheKey = rCache({
  url:'http://www.somethingawesome.com',
  qs: {
    foo: 'bar', // value used in cache key generation
    far: 'boo'
  }
}, function (err, resp, body) {
  // Do something with the awesomeness
});
```

# License

Apache 2.0
