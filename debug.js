const path = require('path');
const webpack = require('webpack');
const MemoryFileSystem = require('memory-fs');

const WebpackCdnUploadPlugin = require('./lib/index').WebpackCdnUploadPlugin;

const OUTPUT_DIR = path.join(__dirname, 'dist');
const CDN_PREFIX = 'http://cdn.com/'

const fs = new MemoryFileSystem();

(async () => {
  await new Promise((resolve, reject) => {
    const compiler = webpack(
      {
        mode: 'development',
        entry: {
          file: path.join(__dirname, 'tests/fixtures', 'file.js'),
        },
        output: {
          path: OUTPUT_DIR,
          filename: '[name].js',
          publicPath: '',
        },
        plugins: [
          new WebpackCdnUploadPlugin({
            upload(_, name) {
              return CDN_PREFIX + name;
            },
            replaceAsyncChunkName: true,
          }),
        ],
      },
    );
    // compiler.outputFileSystem = fs;
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
  })
})();

