const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',  // Main entry file for your JavaScript
  output: {
    path: path.resolve(__dirname, '../backend/static'),  // Output to backend static directory
    filename: 'bundle.js',  // Output file name
  },
  module: {
    rules: [
      {
        test: /\.js$/,  // Test for all JavaScript files
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',  // Template for the HTML entry point
      filename: 'audio_stream.html', // Output to backend static folder as well
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx'],  // Resolve these extensions
  },
  devServer: {
    contentBase: path.join(__dirname, '../backend/static'),
    compress: true,
    port: 9000,
  },
};

