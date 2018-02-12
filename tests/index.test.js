const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const WebpackCdnUploadPlugin = require('../src/index.ts');
const path = require('path');
const OUTPUT_DIR = path.join(__dirname, 'dist');
const CDN_PREFIX = 'http://cdn.toxicjohann.com/';
// const nanoid = require('nanoid');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
// const fs = require('fs');

describe('base behavior test', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  test('call upload function for each chunk', done => {
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
      const js = result.compilation.assets['file.js'].source();
      eval(js);
      const scripts = document.head.getElementsByTagName('script');
      expect(scripts.length).toBe(1);
      expect(scripts[0].src).toBe('0.js');
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  test('replace url for async chunk', done => {
    const compiler = webpack({
      entry: {
        file: path.join(__dirname, 'fixtures', 'file.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const js = result.compilation.assets['file.js'].source();
      eval(js);
      const scripts = document.head.getElementsByTagName('script');
      expect(scripts.length).toBe(1);
      expect(scripts[0].src).toBe(CDN_PREFIX + '0.js');
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  test('replace url for multiple chunk', done => {
    const compiler = webpack({
      entry: {
        file: path.join(__dirname, 'fixtures', 'file-a.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const js = result.compilation.assets['file.js'].source();
      eval(js);
      const scripts = document.head.getElementsByTagName('script');
      expect(scripts.length).toBe(3);
      Array.from(scripts).forEach(script => {
        expect(script.src.indexOf(CDN_PREFIX)).toBe(0);
      });
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  // test('use rename function', done => {
  //   const compiler = webpack({
  //     entry: {
  //       file: path.join(__dirname, 'fixtures', 'file-a.js'),
  //     },
  //     output: {
  //       path: OUTPUT_DIR,
  //       filename: '[name].js',
  //       chunkFilename: 'chunk-[name]-[chunkhash].js',
  //     },
  //     plugins: [
  //       new WebpackCdnUploadPlugin({
  //         rename({ name }) {
  //           return CDN_PREFIX + (name || nanoid()) + '.js';
  //         },
  //       }),
  //       new UglifyJsPlugin(),
  //     ],
  //   }, function(error, result) {
  //     expect(error).toBeFalsy();
  //     expect(result.compilation.errors.length).toBe(0);
  //     console.log(Object.keys(result.compilation.assets));
  //     const js = result.compilation.assets[CDN_PREFIX + 'file.js'].source();
  //     fs.writeFileSync('./test.js', js);
  //     eval(js);
  //     const scripts = document.head.getElementsByTagName('script');
  //     console.log(document.head.innerHTML);
  //     // expect(scripts.length).toBe(3);
  //     Array.from(scripts).forEach(script => {
  //       console.log(script.src);
  //       // expect(script.src.indexOf(CDN_PREFIX)).toBe(0);
  //     });
  //     done();
  //   });
  //   compiler.outputFileSystem = new MemoryFileSystem();
  // });
});
