'use strict';

var shimmer = require('shimmer');

function slice(args) {
  /**
   * Usefully nerfed version of slice for use in instrumentation. Way faster
   * than using [].slice.call, and maybe putting it in here (instead of the
   * same module context where it will be used) will make it faster by
   * defeating inlining.
   *
   *   http://jsperf.com/array-slice-call-arguments-2
   *
   *  for untrustworthy benchmark numbers. Only useful for copying whole
   *  arrays, and really only meant to be used with the arguments arraylike.
   *
   *  Also putting this comment inside the function in an effort to defeat
   *  inlining.
   */
  var length = args.length, array = [], i;

  for (i = 0; i < length; i++) array[i] = args[i];

  return array;
}

module.exports = function patchRedis(ns) {
  var redis = require('redis');
  var proto = redis && redis.RedisClient && redis.RedisClient.prototype;
  shimmer.wrap(proto, 'send_command', function (send_command) {
    return function wrapped() {
      var args     = slice(arguments);
      var last     = args.length - 1;
      var callback = args[last];
      var tail     = callback;

      if (typeof callback === 'function') {
        args[last] = ns.bind(callback);
      }
      else if (Array.isArray(tail) && typeof tail[tail.length - 1] === 'function') {
        last = tail.length - 1;
        tail[last] = ns.bind(tail[last]);
      }

      return send_command.apply(this, args);
    };
  });
  shimmer.wrap(proto, 'internal_send_command', function (internal_send_command) {
    return function wrapped(command_obj) {
      if (command_obj && typeof command_obj.callback === 'function') {
        command_obj.callback = ns.bind(command_obj.callback);
      }

      return internal_send_command.call(this, command_obj);
    };
  });
};
