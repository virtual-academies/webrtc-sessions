
'use strict'

const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: [
    'babel-polyfill',
    './demo/src/index.js'
  ],
  watch: true,
  module: {
    rules: [{
      enforce: 'pre',
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      loader: 'eslint-loader'
    },{
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
      template: './demo/src/index.html',
      inject: true
    })
  ],
  resolve: {
    mainFields: ['browser', 'main', 'module'],
    extensions: ['.js', '.mjs', '.json', '.jsx'],
    symlinks: false
  },
  devServer: {
    port: 3000,
    host: 'localhost',
    contentBase: './demo/src/assets',
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
