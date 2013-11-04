### make CLS play nice with Redis

[`node-redis`](https://github.com/mranney/node_redis) is fast. It uses a lot of
smart techniques to do this that lean heavily upon Redis's architecture. One of
its biggest wins is the way that it takes advantage of pipelining to batch up
commands and push them to the Redis server in chunks.  This works great, unless
you're using CLS, which wants to provide consistent access to stored values
across entire asynchronous call chains. You could use `ns.bind` to put all your
Redis callbacks on the correct continuation chain, but that breaks down if you
forget even one callback passed to `client.get()`.

This shim's job is to take care of the bookkeeping for you. It monkeypatches
the Redis driver to ensure that all the callbacks you provide are bound to the
CLS namespace you provide to the shim. Use it like so:

```js
var cls = require('continuation-local-storage');
var ns = cls.createNamespace('test');

var patchRedis = require('cls-redis');
patchRedis(ns);

var redis = require('redis');
var client = redis.createClient();
```

You can patch Redis for more than one namespace, but you're going to notice the
performance impact pretty quickly, so try not to do that.

Also, if you're using CLS with Q, you're probably going to want to take a look
at [`cls-q`](https://github.com/othiym23/cls-q) as well. At some point, I may
figure out how to eliminate the need for it, but both Q and `node-redis` like
to hide their callbacks in such a way that CLS and the asyncListener
infrastructure have a hard time capturing them.

### tests

The tests assume a Redis server is up and running on localhost on the standard
port.
