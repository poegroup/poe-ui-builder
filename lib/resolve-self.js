/**
 * Module dependencies
 */

var basename = require('path').basename;

function DirectoryDefaultFileResolveSelfPlugin() {}
module.exports = DirectoryDefaultFileResolveSelfPlugin;

DirectoryDefaultFileResolveSelfPlugin.prototype.apply = function(resolver) {
  resolver.plugin("directory", function(request, callback) {
    var fs = this.fileSystem;
    var topLevelCallback = callback;
    var directory = this.join(request.path, request.request);
    fs.stat(directory, function(err, stat) {
      if(err || !stat) {
	if(callback.log) callback.log(directory + " doesn't exist (directory default file)");
	return callback();
      }
      if(!stat.isDirectory()) {
	if(callback.log) callback.log(directory + " is not a directory (directory default file)");
	return callback();
      }
      // only try to load files that don't have a package.json
      fs.stat(this.join(directory, 'package.json'), function(err, packageStat) {
        if (packageStat) return callback();

        this.forEachBail([basename(directory)], function(file, callback) {
	  this.doResolve("file", {
	    path: directory,
	    query: request.query,
	    request: file
	  }, createInnerCallback(function(err, result) {
	    if(!err && result) return callback(result);
	    return callback();
	  }, topLevelCallback, "directory default file " + file));
        }.bind(this), function(result) {
	  if(!result) return callback();
	  return callback(null, result);
        });
      }.bind(this));
    }.bind(this));
  });
};

function createInnerCallback(callback, options, message) {
  var log = options.log;
  if(!log) {
    if(options.stack !== callback.stack) {
      function callbackWrapper() {
	return callback.apply(this, arguments);
      }
      callbackWrapper.stack = options.stack;
    }
    return callback;
  }
  function loggingCallbackWrapper() {
    log(message);
    for(var i = 0; i < theLog.length; i++)
      log("  " + theLog[i]);
    return callback.apply(this, arguments);
  }
  var theLog = [];
  loggingCallbackWrapper.log = function writeLog(msg) {
    theLog.push(msg);
  };
  loggingCallbackWrapper.stack = options.stack;
  return loggingCallbackWrapper;
}
