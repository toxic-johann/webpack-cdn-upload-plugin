/* eslint-disable */
const path = require('path');
const webpack = require('webpack');

const WebpackCdnUploadPlugin = require('./lib/index').default;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const OUTPUT_DIR = path.join(__dirname, 'dist');
const CDN_PREFIX = 'http://cdn.com/';

(async () => {
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: 'development',
      entry: path.join(__dirname, 'tests/fixtures/file/index.js'),
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        chunkFilename: '[name].js',
        publicPath: '/public/',
      },
      module: {
        rules: [
          {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader']
          },
          {
            test: /\.(png|jpe?g|gif)$/,
            use: ['file-loader']
          }
        ],
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new WebpackCdnUploadPlugin({
          upload(_, name) {
            if (/png/.test(name)) return '';
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
        new MiniCssExtractPlugin({ filename: '[name].css' }),
      ],
    });
    compiler.run((err, result) => {
      if (err) {
        console.error(err);
      } else if (result.hasErrors()) {
        console.error(result.toJson().errors);
      } else {
        const fileNames = Object.keys(result.compilation.assets);
        // console.log(fs.readFileSync(path.join(__dirname, 'dist/file.js'), 'utf8'));
        // console.log(fs.readFileSync(path.join(__dirname, 'dist/tests_fixtures_module-a_js.js'), 'utf8'));
        // eval(fs.readFileSync(path.join(__dirname, 'dist/file.js'), 'utf8'));
        // const scripts = document.head.getElementsByTagName('script');
      }
      resolve(undefined);
    });
  });
})();
