const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const WebpackCdnUploadPlugin = require('../index');
const path = require('path');
const OUTPUT_DIR = path.join(__dirname, 'dist');

describe('call upload function when we have upload function and chunk', () => {
  test('call upload for each chunk', done => {
    const fn = jest.fn();
    const fileNames = [];
    const compiler = webpack({
      entry: {
        file: path.join(__dirname, 'fixtures', 'file.js'),
        home: path.join(__dirname, 'fixtures', 'home.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload(...args) {
            fn(...args);
            fileNames.push(args[1]);
          },
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fileNames).toEqual([ '0.js', 'home.js', 'file.js' ]);
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });
});
