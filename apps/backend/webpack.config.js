const path = require('path');
const webpack = require('webpack');

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
    mode: 'production',
    target: 'node',
    externals: [
      // Exclude bcrypt from bundling due to native dependencies
      'bcrypt',
      // You might need to add other native modules here
    ],
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js',
      libraryTarget: 'commonjs2',
      clean: true,
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
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
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
      minimize: false,
      usedExports: false,
      sideEffects: false,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
      concatenateModules: false,
      moduleIds: 'named',
      chunkIds: 'named',
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
        '@tenantflow/shared': path.resolve(__dirname, '../../packages/shared/dist'),
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