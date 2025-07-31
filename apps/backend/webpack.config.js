const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  const lazyImports = [
    '@nestjs/microservices/microservices-module',
    '@nestjs/websockets/socket-module',
    'class-transformer/storage',
  ];

  // Increase memory limit for ts-checker
  process.env.NODE_OPTIONS = '--max-old-space-size=8192 --max-semi-space-size=512';

  return {
    ...options,
    entry: './src/main.ts',
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    target: 'node',
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js',
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          if (lazyImports.includes(resource)) {
            try {
              require.resolve(resource);
            } catch (err) {
              return true;
            }
          }
          return false;
        },
      }),
      // Memory optimization
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
      // Progressive webpack build
      new webpack.ProgressPlugin({
        activeModules: false,
        entries: true,
        modules: false,
        modulesCount: 100,
        profile: false,
        dependencies: false,
        dependenciesCount: 10000,
        percentBy: null,
      }),
    ],
    optimization: {
      minimize: false, // Keep readable for debugging
      usedExports: true,
      sideEffects: false,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
      concatenateModules: false,
    },
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
      compression: 'gzip',
      buildDependencies: {
        config: [__filename],
      },
    },
    stats: {
      errors: true,
      errorDetails: true,
      warnings: true,
      colors: true,
      modules: false,
      assets: false,
      chunks: false,
      entrypoints: false,
      hash: false,
      timings: true,
      version: false,
    },
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        // Resolve path aliases to avoid complex resolution
        '@': path.resolve(__dirname, 'src'),
        '@auth': path.resolve(__dirname, 'src/auth'),
        '@common': path.resolve(__dirname, 'src/common'),
        '@config': path.resolve(__dirname, 'src/config'),
        '@database': path.resolve(__dirname, 'src/database'),
        '@invoices': path.resolve(__dirname, 'src/invoices'),
        '@leases': path.resolve(__dirname, 'src/leases'),
        '@maintenance': path.resolve(__dirname, 'src/maintenance'),
        '@notifications': path.resolve(__dirname, 'src/notifications'),
        '@payments': path.resolve(__dirname, 'src/payments'),
        '@properties': path.resolve(__dirname, 'src/properties'),
        '@stripe': path.resolve(__dirname, 'src/stripe'),
        '@subscriptions': path.resolve(__dirname, 'src/subscriptions'),
        '@tenants': path.resolve(__dirname, 'src/tenants'),
        '@users': path.resolve(__dirname, 'src/users'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@utils': path.resolve(__dirname, 'src/utils'),
      },
    },
    module: {
      ...options.module,
      rules: [
        ...options.module.rules,
        {
          test: /\.node$/,
          use: 'node-loader',
        },
      ],
    },
  };
};