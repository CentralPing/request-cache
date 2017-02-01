request-cache
====================

[![Greenkeeper badge](https://badges.greenkeeper.io/CentralPing/request-cache.svg)](https://greenkeeper.io/)

[ ![Codeship Status for CentralPing/request-cache](https://codeship.com/projects/f8e35830-b7ae-0132-1e43-1e8b2f627676/status)](https://codeship.com/projects/71302)
[ ![Code Climate for CentralPing/request-cache](https://codeclimate.com/github/CentralPing/request-cache/badges/gpa.svg)](https://codeclimate.com/github/CentralPing/request-cache)
[ ![Dependency Status for CentralPing/request-cache](https://david-dm.org/CentralPing/request-cache.svg)](https://david-dm.org/CentralPing/request-cache)

Simple request caching using [Redis](https://github.com/mranney/node_redis) for [request](https://github.com/request/request).

## API Reference
**Example**  
```js
var requestCache = require('request-cache');
var rCache = requestCache(REDIS_CLIENT);
var cacheKey;

setInterval(function () {
  var key = rCache('http://www.somethingawesome.com', function (err, resp, body) {
    // Do something with the awesomeness
  });

  // First call - cacheKey is undefined; resp and body are cached and returned
  // Second call - cacheKey === key; cached resp and body are returned
  // Third call - cacheKey === key; cached resp and body are returned
  // ...
  // Three-thousand-six-hundredth call - cacheKey === key; new resp and body are cached returned

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
var requestCache = require('request-cache');
var rCache = requestCache(REDIS_CLIENT);

var cacheKey = rCache('http://www.somethingawesome.com', function (err, resp, body) {
  // Do something with the awesomeness
});
```

### With Request Object
```js
var requestCache = require('request-cache');
var rCache = requestCache(REDIS_CLIENT);

var cacheKey = rCache({
  url:'http://www.somethingawesome.com',
}, function (err, resp, body) {
  // Do something with the awesomeness
});
```

### With Cache Key Options
```js
var requestCache = require('request-cache');
var rCache = requestCache(REDIS_CLIENT, {
  queryCacheKeys: ['foo']
});

var cacheKey = rCache({
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
