/**
 * Module dependencies
 */

var envs = require('envs');
var write = require('fs').writeFileSync;
var list = require('fs').readdirSync;
var join = require('path').join;
var resolve = require('path').resolve;
var Path = require('path');
var glob = require('glob');
var byExtension = require('./lib/loaders-by-extension');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
// polyfill Promises
require('es6-promise').polyfill();
var OptimizeCssPlugin = require('optimize-css-assets-webpack-plugin');
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
var OUTPUT_PATTERN = envs('OUTPUT_PATTERN', '[name]');
var MAIN_ENTRY = DEVELOPMENT ? 'app' : envs('MAIN_ENTRY', 'main');
var COMPILE_ENV = envs('COMPILE_ENV', '1') !== '0';

module.exports = function(dirname, webpack) {
  var config = {
    sourcedir: dirname,
    cache: true
  };

  /**
   * Configure the entries
   */

  var target = config.target = BUILD_TARGET;

  // Autoload all of the modules
  config.entry = {};
  config.entry[MAIN_ENTRY] = dirname + '/index.js';

  if (target === 'node') {
    config.entry = {
      server: dirname + '/server'
    };
  }

  config.output = {
    path: Path.dirname(dirname) + '/build',
    filename: (DEVELOPMENT || !HASH) ?
      OUTPUT_PATTERN + '.js' :
      OUTPUT_PATTERN + (DISABLE_MIN ? '' : '.min') + '.js?[chunkhash]',
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
      entries.push('webpack-dev-server/client?' + envs('WEBPACK_DEV_SERVER_URL', 'http://localhost:' + envs('PORT', '3000')));
      entries.push('webpack/hot/dev-server');
      config.entry = entries;
    }
  }

  /**
   * Configure plugins
   */

  config.plugins = [
    new webpack.IgnorePlugin(/vertx/),
    envify(webpack),
    new webpack.DefinePlugin({
      'browser.env': '__env__',
      'process.BUILD_TARGET': JSON.stringify(target)
    }),
    new webpack.ResolverPlugin([
      new ResolveSelf()
    ], ['normal'])
  ];

  var extractPlugin = new ExtractTextPlugin('style', OUTPUT_PATTERN + (DISABLE_MIN ? '' : '.min') + '.css?[chunkhash]');

  if (EXTRACT_STYLE) {
    config.plugins.push(extractPlugin);
  }

  if (!DEVELOPMENT) {
    config.plugins.push(
      new webpack.optimize.AggressiveMergingPlugin({
        moveToParents: true
      })
    );

    if (!envs('DISABLE_MIN')) config.plugins.push(
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({
        output: {comments: false},
        sourceMap: false,
        exclude: [/\.ess/]
      }),
      new OptimizeCssPlugin({
        assetNameRegExp: /\.css/
      })
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
    extensions: ['', '.js'],
    modulesDirectories: ['web_modules', 'node_modules', 'src/modules'],
    fallback: [process.cwd(), process.cwd() + '/node_modules'],
    alias: {
      fs: __dirname + '/lib/fs.shim.js'
    }
  };

  config.resolveLoader = {
    fallback: [process.cwd(), process.cwd() + '/node_modules']
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

  /**
   * Setup style loading
   */

  config.addStyle = function(ext, loader, styleLoader) {
    styleLoader = styleLoader || 'style-loader';
    config.addLoader(ext, !EXTRACT_STYLE ? styleLoader + '!' + loader : extractPlugin.extract(loader));
  };

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

function envify(webpack) {
  var env = COMPILE_ENV ? null : function(name) {
    return '___POE_UI_BUILDER_ENV_BEGIN___' + name + '___POE_UI_BUILDER_ENV_END___';
  };
  return new EnvifyPlugin(env, webpack);
}

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
