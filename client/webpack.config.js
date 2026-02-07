const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function (env, { mode }) {
  const production = mode === 'production';

  return {
    mode: production ? 'production' : 'development',
    devtool: production ? 'source-map' : 'eval-source-map',
    entry: {
      entry: './src/main.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      publicPath: '/',
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.js', '.html'],
      modules: [path.resolve(__dirname, 'src'), 'node_modules']
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.ts$/i,
          use: ['ts-loader', '@aurelia/webpack-loader'],
          exclude: /node_modules/
        },
        {
          test: /\.html$/i,
          use: '@aurelia/webpack-loader',
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.ejs'
      })
    ],
    devServer: {
      port: 9000,
      historyApiFallback: true,
      open: false,
      proxy: {
        '/api': 'http://localhost:3000',
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true
        }
      }
    }
  };
};
