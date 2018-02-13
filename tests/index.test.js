const MemoryFileSystem = require('memory-fs');
const webpack = require('webpack');
const WebpackCdnUploadPlugin = require('../src/index.ts');
const path = require('path');
const OUTPUT_DIR = path.join(__dirname, 'dist');
const CDN_PREFIX = 'http://cdn.toxicjohann.com/';
// const nanoid = require('nanoid');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
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
      expect(fileNames.includes('0.js')).toBe(true);
      expect(fileNames.includes('home.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
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
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('0.js')).toBe(true);
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
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('0.js')).toBe(true);
      expect(fileNames.includes('1.js')).toBe(true);
      expect(fileNames.includes('2.js')).toBe(true);
      expect(fileNames.includes('3.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(js);
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(CDN_PREFIX + '0.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + '1.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + '2.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  test('work in uglify plugin and support custom chunk file name', done => {
    const compiler = webpack({
      entry: {
        file: path.join(__dirname, 'fixtures', 'file-a.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        chunkFilename: 'chunk-[name].js',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
        }),
        new UglifyJsPlugin(),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const js = result.compilation.assets['file.js'].source();
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('chunk-3.js')).toBe(true);
      expect(fileNames.includes('chunk-1.js')).toBe(true);
      expect(fileNames.includes('chunk-2.js')).toBe(true);
      expect(fileNames.includes('chunk-vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(js);
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(CDN_PREFIX + 'chunk-vendor.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + 'chunk-1.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + 'chunk-2.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  test('only replace part of url for multiple chunk', done => {
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
            if (name !== '0.js') return;
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const js = result.compilation.assets['file.js'].source();
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('0.js')).toBe(true);
      expect(fileNames.includes('1.js')).toBe(true);
      expect(fileNames.includes('2.js')).toBe(true);
      expect(fileNames.includes('3.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(js);
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(CDN_PREFIX + '0.js')).toBe(true);
      expect(srcs.includes('1.js')).toBe(true);
      expect(srcs.includes('2.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  test('only replace part of url for multiple chunk and support publich path', done => {
    const compiler = webpack({
      entry: {
        file: path.join(__dirname, 'fixtures', 'file-a.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        publicPath: '/public/',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            if (name !== '0.js') return;
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const js = result.compilation.assets['file.js'].source();
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('0.js')).toBe(true);
      expect(fileNames.includes('1.js')).toBe(true);
      expect(fileNames.includes('2.js')).toBe(true);
      expect(fileNames.includes('3.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      // fs.writeFileSync('./what.js', js);
      eval(js);
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(CDN_PREFIX + '0.js')).toBe(true);
      expect(srcs.includes('/public/1.js')).toBe(true);
      expect(srcs.includes('/public/2.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });


  test('support upload multiple chunk and do not affect publich path in async chunk when we do not replace async chunk name', done => {
    const compiler = webpack({
      entry: {
        file: path.join(__dirname, 'fixtures', 'file-a.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        publicPath: '/public/',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            return CDN_PREFIX + name;
          },
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const js = result.compilation.assets['file.js'].source();
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('0.js')).toBe(true);
      expect(fileNames.includes('1.js')).toBe(true);
      expect(fileNames.includes('2.js')).toBe(true);
      expect(fileNames.includes('3.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(js);
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes('/public/0.js')).toBe(true);
      expect(srcs.includes('/public/1.js')).toBe(true);
      expect(srcs.includes('/public/2.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });
});
