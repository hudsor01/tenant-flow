const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: './src/main.ts',
    mode: 'production',
    target: 'node',
    // Don't bundle node_modules
    externals: [nodeExternals({
      // Allow bundling of @tenantflow/shared since it's our internal package
      allowlist: ['@tenantflow/shared', /^@tenantflow\/shared/]
    })],
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js',
      libraryTarget: 'commonjs2',
    },
    optimization: {
      minimize: false,
    },
    resolve: {
      ...options.resolve,
      extensions: ['.ts', '.js'],
      alias: {
        '@tenantflow/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
  };
};