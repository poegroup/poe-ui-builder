/**
 * Module dependencies
 */

var debug = require('debug')('envify-plugin');

module.exports = Envify;

function Envify(envs, webpack) {
  this.envs = envs || process.env;
  this.defs = {};
  this.DefinePlugin = webpack.DefinePlugin;
}

Envify.prototype.apply = function(compiler) {
  var self = this;
  var envs = this.envs;
  var applyPluginsBailResult = compiler.parser.applyPluginsBailResult;
  var DefinePlugin = this.DefinePlugin;
  compiler.parser.applyPluginsBailResult = function(str, expr) {
    if (/process\.env\.[a-zA-Z0-9_-]+$/.test(str) && expr.type === 'MemberExpression') {
      var name = expr.property.name;
      if (!self.defs[name]) new DefinePlugin(evaluate(name, expr, envs)).apply(compiler);
      self.defs[name] = true;
    }
    return applyPluginsBailResult.apply(this, arguments);
  }
};

function evaluate(name, expr, envs) {
  var value = typeof envs === 'function' ?
    envs(name) :
    JSON.stringify(parse(envs[name] || null));

  var obj = {};
  obj['process.env.' + name] = value;
  debug('defining %s %s', name, value);
  return obj;
}

function parse(val) {
  if (val === 'false') return false;
  if (val === 'true') return true;
  var num = parseFloat(val, 10);
  if (!isNaN(num)) return num;
  return val;
}
