/**
 * Module dependencies
 */

var resolve = require('component-resolver');
var Remotes = require('remotes');
var Build = require('component-builder');
var GitHubContentAPI = require('component-github-content-api');
var ignores = require('./ignore');
var jade = require('./jade');
var stylus = require('./stylus');
var poe = require('./poe');
var plugins = Build.plugins;
var write = require('fs').writeFile;
var mkdirp = require('mkdirp');
var dirname = require('path').dirname;
var merge = require('utils-merge');

var remotes = Remotes({
  local: true,
  out: 'components'
});

// replace the github remote

var github = new GitHubContentAPI();
remotes.remotes.push(github);
remotes.remote.github = github;

var defaults = {
  install: true,
  dev: process.env.NODE_ENV === 'development',
  remote: remotes
};

exports.scripts = function(path, ignore, out, opts, fn) {
  if (typeof opts === 'function') {
    fn = opts;
    opts = {};
  }
  opts = merge(opts, merge({}, defaults));
  resolve(path, opts, function(err, tree) {
    if (err) return fn(err);

    if (ignores[ignore]) ignores[ignore](tree);

    var autoload = ignore === 'vendor' && poe.init(tree);

    Build.scripts(tree)
      .use('scripts', poe.js(autoload), plugins.js())
      .use('json', plugins.json())
      .use('templates', jade(), plugins.string())
      .end(function(err, str) {
        if (err) return fn(err);
        mkdirp(dirname(out), function(err) {
          if (err) return fn(err);
          write(out, str, 'utf8', fn);
        });
      });
  });
};

exports.styles = function(path, ignore, out, opts, fn) {
  if (typeof opts === 'function') {
    fn = opts;
    opts = {};
  }
  opts = merge(opts, merge({}, defaults));
  resolve(path, opts, function(err, tree) {
    if (err) return fn(err);

    var loaded = false;

    if (ignores[ignore]) ignores[ignore](tree);

    poe.init(tree, true);

    Build.styles(tree)
      .use('styles', stylus(), plugins.urlRewriter(''))
      .end(function(err, str) {
        if (err) return fn(err);
        mkdirp(dirname(out), function(err) {
          if (err) return fn(err);
          write(out, str, 'utf8', fn);
        });
      });

    Build.files(tree)
      .use('images', plugins.copy())
      .use('fonts', plugins.copy())
      .use('files', plugins.copy())
      .end(function(err) {
        if (err) console.error(err.stack || err);
      });
  });
};
