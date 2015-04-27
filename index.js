/**
 * Module dependencies
 */

var envs = require('envs');
var webpack = require('webpack');
var write = require('fs').writeFileSync;
var list = require('fs').readdirSync;
var join = require('path').join;
var resolve = require('path').resolve;
var glob = require('glob');
var byExtension = require('./lib/loaders-by-extension');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var ResolveSelf = require('./lib/resolve-self');
// remove this once webpack releases it
// WatchIgnorePlugin = webpack.WatchIgnorePlugin
var WatchIgnorePlugin = require('./lib/watch-ignore');
var EnvifyPlugin = require('./lib/envify-plugin');

var DISABLE_MIN = !!envs('DISABLE_MIN');
var NODE_ENV = envs('ASSET_ENV', envs('NODE_ENV', 'production'));
var DEVELOPMENT = NODE_ENV === 'development';
var HASH = typeof envs('DISABLE_HASH') === 'undefined';
var MANIFEST = envs('MANIFEST');
var BUILD_TARGET = envs('BUILD_TARGET', 'web');
var EXTRACT_STYLE = !DEVELOPMENT && envs('EXTRACT_STYLE', BUILD_TARGET === 'node') !== '0';

module.exports = function(dirname) {
  var config = {
    sourcedir: dirname
  };

  /**
   * Configure the entries
   */

  var target = config.target = BUILD_TARGET;

  // Autoload all of the modules
  config.entry = DEVELOPMENT ? {
    app: dirname + '/index.js'
  } : {
    main: dirname + '/index.js'
  };

  if (target === 'node') {
    config.entry = {
      server: dirname + '/server'
    };
  }

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

    if (config.target === 'web') {
      // use the eval builder for optimal speed in development
      config.devtool = 'eval';

      var entries = [config.entry.app];
      // append the hot reload entries
      entries.push('webpack-dev-server/client?http://localhost:' + envs('PORT', '3000'));
      entries.push('webpack/hot/dev-server');
      config.entry = entries;
    }
  }

  /**
   * Configure plugins
   */

  config.plugins = [
    new webpack.IgnorePlugin(/vertx/),
    new EnvifyPlugin(),
    new webpack.DefinePlugin({
      'browser.env': '__env__'
    }),
    new webpack.ResolverPlugin([
      new ResolveSelf()
    ], ['normal'])
  ];

  if (EXTRACT_STYLE) {
    config.plugins.push(new ExtractTextPlugin('[name]' + (DISABLE_MIN ? '' : '.min') + '.css?[chunkhash]'));
  }

  if (!DEVELOPMENT) {
    config.plugins.push(
      new webpack.optimize.AggressiveMergingPlugin({
        moveToParents: true
      })
    );

    if (!envs('DISABLE_MIN')) config.plugins.push(
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({output: {comments: false}, sourceMap: false})
    );

    if (MANIFEST) config.plugins.push(createManifest(MANIFEST));
  } else {
    // append the hot reload plugin
    if (config.target === 'web') config.plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  /**
   * configure resolution
   */

  config.resolve = {
    extensions: ['', '.js', '.json', '.html'],
    modulesDirectories: ['web_modules', 'node_modules', 'src/modules']
  };

  /**
   * Configure loaders
   */

  config.module = {
    loaders: []
  };

  config.addLoader = function(ext, loader) {
    if (ext instanceof RegExp) return config.module.loaders.push({test: ext, loader: loader, loaders: loader});
    var obj = {};
    obj[ext] = loader;
    return config.module.loaders.push.apply(config.module.loaders, byExtension(obj));
  };

  config.addLoader('json', 'json-loader');

  /**
   * Setup style loading
   */

  config.addStyle = function(ext, loader) {
    config.addLoader(ext, !EXTRACT_STYLE ? 'style-loader!' + loader : ExtractTextPlugin.extract(loader));
  };

  config.addStyle('css', 'css-loader');
  config.addStyle('styl', 'css-loader!stylus-loader?paths=node_modules');

  /**
   * Configure development stuff
   */

  var watchIgnores = [];

  config.load = function() {
    if (watchIgnores.length) config.plugins.push(new WatchIgnorePlugin(watchIgnores));
    return webpack(config);
  };

  config.watchIgnore = function() {
    watchIgnores.push.apply(watchIgnores, arguments);
  };

  config.prefetchWildcard = function(pattern, opts, ignore) {
    glob.sync(pattern, opts).forEach(function(file) {
      if (ignore && file.match(ignore)) return;
      config.prefetchModule(resolve(process.cwd(), file));
    });
  };

  config.prefetchModule = function(context, request) {
    config.plugins.push(new webpack.PrefetchPlugin(context, request));
  };

  return config;
};

function createManifest(manifest) {
  return function() {
    this.plugin('done', function(stats) {
      var json = stats.toJson();
      var byChunkName = json.assetsByChunkName;
      var out = json.assets.reduce(function(acc, asset) {
        if (!asset.chunkNames.length) {
          if (~asset.name.indexOf('.js')) acc.chunks.push(asset.name);
          return acc;
        }
        if (~asset.name.indexOf('.css')) acc.styles.push(asset.name);
        if (~asset.name.indexOf('.js')) acc.scripts.push(asset.name);
        return acc;
      }, {
        styles: [],
        scripts: [],
        chunks: []
      });

      write(manifest, JSON.stringify(out, null, '  '));
    });
  };
}
