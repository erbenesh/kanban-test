'use strict';

const path = require('path');

module.exports = (_env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: path.resolve(__dirname, 'src/index.html'),
    target: 'web',
    bail: isProduction,
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      htmlFilename: 'index.html',
      cssFilename: isProduction ? 'css/[name].[contenthash:8].css' : 'css/[name].css',
      cssChunkFilename: isProduction
        ? 'css/[name].[contenthash:8].css'
        : 'css/[name].css',
      publicPath: isProduction ? 'auto' : '/',
      clean: true,
    },
    experiments: {
      css: true,
      html: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: false,
              onlyCompileBundledFiles: true,
              compilerOptions: {
                noEmit: false,
              },
            },
          },
        },
      ],
      parser: {
        'css/auto': {
          namedExports: false,
        },
      },
      generator: {
        'css/auto': {
          exportsConvention: 'as-is',
          localIdentName: isProduction
            ? '[hash:base64:8]'
            : '[name]__[local]--[hash:base64:5]',
        },
      },
    },
    devServer: {
      host: '127.0.0.1',
      port: 3000,
      hot: true,
      historyApiFallback: true,
      client: {
        overlay: true,
      },
    },
    stats: {
      colors: true,
      errorDetails: true,
    },
    infrastructureLogging: {
      level: 'warn',
    },
  };
};
