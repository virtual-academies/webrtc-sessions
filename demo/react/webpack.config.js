
'use strict'

const HtmlWebpackPlugin = require('html-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
  mode: 'development',
  target: 'web',
  devtool: 'eval-source-map',
  entry: [
    'babel-polyfill',
    './demo/react/src/index.js'
  ],
  module: {
    rules: [{
      test: /\.(js|jsx)$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader'
    }, {
      test: /\.(css)$/,
      exclude: /(node_modules)/,
      use: [{
        loader: 'style-loader'
      },{
        loader: 'css-loader',
        options: {
          modules: true
        }
      }]
    }, {
      test: /\.(json)$/,
      exclude: /(node_modules)/,
      loader: 'json-loader'
    },{
      test: /\.(png|jpeg|jpg|gif|eot|ttf|woff|woff2)$/,
      loader: 'file-loader'
    }]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './demo/react/src/index.html',
      inject: true
    }),
    new ESLintPlugin()
  ],
  resolve: {
    mainFields: ['browser', 'main', 'module'],
    extensions: ['.js', '.mjs', '.json', '.jsx'],
    symlinks: false
  },
  devServer: {
    port: 5000,
    host: 'localhost',
    contentBase: './demo/react/src/assets',
    historyApiFallback: true,
    noInfo: false,
    stats: {
      colors: true,
      progress: true
    },
    quiet: false,
    hot: true
  }
}
