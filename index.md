

<!-- Start README.md -->

<!-- End README.md -->

<!-- Start index.js -->

## exports(REDIS_CLIENT, OPTIONS)

Creates a

### Available options:

 * {String} algorithm: Any available algo defaults to *md5* ([more info](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm))
 * {String} encoding: Path or the custom template
 * {Number} ttl: Time in seconds for cache time-to-live
 * {Number} refresh: Time in seconds to refresh time-to-live (this does not initiate a new request)
 * {Array} queryCacheKeys: Query param keys to use for generating cache key
 * {String} keyPrefix: Prefix for cache keys

### Examples:

    var requestCache = require('request-cache');
    var rCache = requestCache(REDIS_CLIENT[, OPTIONS]);

### Params:

* **Object** *REDIS_CLIENT* an instance of a [redis client](https://github.com/mranney/node_redis)
* **Object** *OPTIONS* optional options

### Return:

* **Function** 

## requestCache(REQ_OBJ, KEY, NEXT)

Caches successful request calls for subsequent requests

### Examples:

    var cacheKey = rCache(REQ_OBJ[, KEY], NEXT);

### Params:

* **Object|String** *REQ_OBJ* or a URL ([more info](https://github.com/request/request#requestoptions-callback))
* **String** *KEY* optional cacheKey value
* **Function** *NEXT* callback function *next(err, resp, body)*

### Return:

* **Function** 

<!-- End index.js -->

