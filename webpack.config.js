const path = require('path');

module.exports = {
  entry: './viz.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname)
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },
      { test: /\.jsx$/, loader: 'babel-loader', exclude: /node_modules/ }
    ]
  }
};
