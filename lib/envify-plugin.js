/**
 * Module dependencies
 */

var DefinePlugin = require('webpack/lib/DefinePlugin');

module.exports = Envify;

function Envify(envs) {
  this.envs = envs || process.env;
}

Envify.prototype.apply = function(compiler) {
  var self = this;
  var envs = this.envs;
  var applyPluginsBailResult = compiler.parser.applyPluginsBailResult;
  compiler.parser.applyPluginsBailResult = function(str, expr) {
    if (~str.indexOf('process.env.')) {
      new DefinePlugin(evaluate(expr, envs)).apply(compiler);
    }
    return applyPluginsBailResult.apply(this, arguments);
  }
};

function evaluate(expr, envs) {
  var name = expr.property.name;
  var value = envs[name] || null;
  var obj = {};
  obj['process.env.' + name] = JSON.stringify(value);
  return obj;
}