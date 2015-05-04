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
    if (/process\.env\.[a-zA-Z0-9_-]+$/.test(str)) new DefinePlugin(evaluate(expr, envs)).apply(compiler);
    return applyPluginsBailResult.apply(this, arguments);
  }
};

function evaluate(expr, envs) {
  var name = expr.property.name;
  var value = envs[name] || null;
  var obj = {};
  obj['process.env.' + name] = JSON.stringify(parse(value));
  return obj;
}

function parse(val) {
  if (val === 'false') return false;
  if (val === 'true') return true;
  var num = parseFloat(val, 10);
  if (!isNaN(num)) return num;
  return val;
}