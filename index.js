/**
 * Module dependencies
 */

var envs = require('envs');
var webpack = require('webpack');
var write = require('fs').writeFileSync;
var list = require('fs').readdirSync;
var join = require('path').join;

var DISABLE_MIN = !!envs('DISABLE_MIN');
var NODE_ENV = envs('NODE_ENV', 'production');
var DEVELOPMENT = NODE_ENV === 'development';
var HASH = typeof envs('DISABLE_HASH') === 'undefined';
var MANIFEST = envs('MANIFEST');

module.exports = function(dirname) {
  var config = {};

  /**
   * Configure the entries
   */

  // Autoload all of the modules
  config.entry = {
    app: dirname + '/index.js'
  };
  config.output = {
    path: dirname,
    filename: (DEVELOPMENT || !HASH) ?
      '[name].js' :
      '[name]-[chunkhash]' + (DISABLE_MIN ? '' : '.min') + '.js',
    libraryTarget: 'this'
  };

  if (envs('SOURCE_MAP')) {
    config.output.sourceMapFilename = '[file].map';
    config.devtool = 'source-map';
  }

  if (DEVELOPMENT) {
    config.output.pathinfo = true;
    config.output.publicPath = '/build/';

    // use the eval builder for optimal speed in development
    config.devtool = 'eval';

    var entries = [config.entry.app];
    // append the hot reload entries
    entries.push('webpack-dev-server/client?http://localhost:' + envs('PORT', '3000'));
    entries.push('webpack/hot/dev-server');
    config.entry = entries;
  }

  /**
   * Configure plugins
   */

  config.plugins = [
    new webpack.IgnorePlugin(/vertx/),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"' + NODE_ENV + '"'
    })
  ];

  if (!DEVELOPMENT) {
    config.plugins.push(new webpack.optimize.OccurrenceOrderPlugin());
    if (!envs('DISABLE_MIN')) config.plugins.push(new webpack.optimize.UglifyJsPlugin({output: {comments: false}}));
    config.plugins.push(new webpack.optimize.AggressiveMergingPlugin());
    if (MANIFEST) config.plugins.push(createManifest(MANIFEST));
  } else {
    // append the hot reload plugin
    config.plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  /**
   * configure resolution
   */

  config.resolve = {
    extensions: ['', '.js', '.html']
  };

  /**
   * Configure loaders
   */

  config.module = {
    loaders: []
  };

  /**
   * Configure development stuff
   */


  config.load = function() {
    return webpack(config);
  };

  return config;
};

function createManifest(manifest) {
  return function() {
    this.plugin('done', function(stats) {
      var out = JSON.stringify(stats.toJson().assetsByChunkName, null, '  ');
      write(manifest, out);
    });
  };
}
