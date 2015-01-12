/**
 * Module dependencies
 */

var envs = require('envs');
var webpack = require('webpack');
var write = require('fs').writeFileSync;
var list = require('fs').readdirSync;
var join = require('path').join;
var byExtension = require('./lib/loaders-by-extension');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var ResolveSelf = require('./lib/resolve-self');

var DISABLE_MIN = !!envs('DISABLE_MIN');
var NODE_ENV = envs('ASSET_ENV', envs('NODE_ENV', 'production'));
var DEVELOPMENT = NODE_ENV === 'development';
var HASH = typeof envs('DISABLE_HASH') === 'undefined';
var MANIFEST = envs('MANIFEST');

module.exports = function(dirname) {
  var config = {};

  /**
   * Configure the entries
   */

  // Autoload all of the modules
  config.entry = DEVELOPMENT ? {
    app: dirname + '/index.js'
  } : {
    main: dirname + '/index.js'
  };

  config.output = {
    path: dirname,
    filename: (DEVELOPMENT || !HASH) ?
      '[name].js' :
      '[name]' + (DISABLE_MIN ? '' : '.min') + '.js?[chunkhash]',
    libraryTarget: 'this'
  };

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
      'process.env': {
        NODE_ENV: JSON.stringify(NODE_ENV)
      }
    }),
    new webpack.ResolverPlugin([
      new ResolveSelf()
    ], ['normal'])
  ];

  if (!DEVELOPMENT) {
    config.plugins.push(
      new webpack.optimize.AggressiveMergingPlugin(),
      new ExtractTextPlugin('[name].css?[chunkhash]')
    );

    if (!envs('DISABLE_MIN')) config.plugins.push(
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({output: {comments: false}}),
      new webpack.optimize.DedupePlugin()
    );

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

  config.addLoader = function(ext, loader) {
    var obj = {};
    obj[ext] = loader;
    config.module.loaders.push.apply(config.module.loaders, byExtension(obj));
  };

  /**
   * Setup style loading
   */

  extract('css', 'css-loader');
  extract('styl', 'css-loader!stylus-loader?paths=node_modules');

  function extract(ext, loader) {
    config.addLoader(ext, DEVELOPMENT ? 'style-loader!' + loader : ExtractTextPlugin.extract('style-loader', loader));
  }

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
