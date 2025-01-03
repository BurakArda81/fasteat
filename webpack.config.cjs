const path = require('path');

module.exports = {
  entry: {
    components: './public/components.js',
    scripts: './public/src/scripts.js'
  },
  output: {
    path: path.resolve(__dirname, 'public/dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'public'),
      '@components': path.resolve(__dirname, 'public/components')
    }
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    'recharts': 'Recharts',
    'lodash': '_'
  },
  devtool: 'source-map'
};