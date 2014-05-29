/**
 * Module dependencies
 */

var stylus = require('stylus');
var nib = require('nib');

module.exports = function(opts) {
  opts = opts || {};
  var root = opts.root || process.cwd();
  var paths = opts.paths || [root, root + '/node_modules', root + '/components'];
  return function(file, done) {
    if (!~file.path.indexOf('index.styl')) return done();
    file.read(function(err, content) {
      if (err) return done(err);

      stylus(content)
        .set('paths', paths)
        .set('include css', true)
        .set('filename', file.filename)
        .use(nib())
        .render(function(err, css) {
          if (err) return done(err);

          file.string = css;
          done();
        });
    });
  };
};
