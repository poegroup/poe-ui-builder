/**
 * Module dependencies
 */

var glob = require('glob').sync;
var minimatch = require('minimatch');

/**
 * Get a tree ready for the poe-ui plugins
 */

exports.init = function (tree, styles) {
  var node = tree.node;
  if (!node.dependencies || !node.dependencies['poegroup/poe-ui']) return false;
  if (styles) return node.styles = ['public/stylesheets/index.styl'];
  node.main = 'app.js';
  node.scripts = glob('public/javascripts/**/*.js');
  node.templates = glob('public/partials/**.+(jade|html)');
  node.scripts.splice(0, 0, node.main);
  return true;
}

/**
 * Load the
 */

exports.js = function(autoload) {
  return function (file, done) {
    if (!autoload || file.path !== 'app.js') return done();
    var partials = file.node.templates;

    file.string = [
      header,
      js(file, 'directive'),
      js(file, 'controller'),
      js(file, 'filter'),
      js(file, 'service'),
      render(partials, 'view')
    ].join('');

    done();
  }
}

var header = "\
require('angular');\n\
exports = module.exports = require('./public/javascripts/index.js');\n\
try { exports.use(require('angular-router')); } catch(err) {}\n\
exports.routes(require('./public/javascripts/routes.js'));\n";

function js(file, name) {
  var root = 'public/javascripts/' + name + 's';
  var coll = file.node.scripts.filter(minimatch.filter(root + '/*.js'));
  return render(coll, name);
}

function render(coll, method) {
  if (!coll.length) return '';
  return coll.map(function(item) {
    var name = item.replace('public', '');
    if (method !== 'view') name = name.replace('/javascripts/' + method + 's/', '').replace('.js', '');
    return 'exports.' + method + "(\'" + name + "', require('./" + item + "'));";
  }).join('\n') + '\n';
}
