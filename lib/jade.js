/**
 * Module dependencies
 */

var jade = require('jade');

module.exports = function() {
  return function(file, done) {
    if (file.extension !== 'jade') return done();
    var read = file.read;
    file.read = function(fn) {
      read.call(file, function(err, string) {
        if (err) return fn(err);
        try {
          string = jade.render(string, {
            filename: file.filename
          });
        } catch (err) {
          return fn(err);
        };
        fn(null, string);
      });
    };
    done();
  };
};
