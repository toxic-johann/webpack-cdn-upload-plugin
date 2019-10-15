/**
 * @jest-environment node
 */
const webpack = require('webpack');
const WebpackCdnUploadPlugin = require('../src/index.ts');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const path = require('path');
const OUTPUT_DIR = path.join(__dirname, 'dist');
const CDN_PREFIX = 'http://cdn.toxicjohann.com/';
const MemoryFileSystem = require('memory-fs');


describe('as uglify need node setTimeout, we run it in node environment', () => {
  test('support custom chunk file name', done => {
    const compiler = webpack({
      mode: 'development',
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
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('chunk-0.js')).toBe(true);
      expect(fileNames.includes('chunk-1.js')).toBe(true);
      expect(fileNames.includes('chunk-2.js')).toBe(true);
      expect(fileNames.includes('chunk-vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      const js = result.compilation.assets['file.js'].source();
      const html = `<head></head><body><script>${js}</script></body>`;
      const { window: { document } } = new JSDOM(html, { runScripts: 'dangerously' });
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(CDN_PREFIX + 'chunk-vendor.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + 'chunk-0.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + 'chunk-1.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });

  test('support custom chunk file name with uglify plugin', done => {
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
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('chunk-2.js')).toBe(true);
      expect(fileNames.includes('chunk-3.js')).toBe(true);
      expect(fileNames.includes('chunk-4.js')).toBe(true);
      expect(fileNames.includes('chunk-vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      const js = result.compilation.assets['file.js'].source();
      const html = `<head></head><body><script>${js}</script></body>`;
      const { window: { document } } = new JSDOM(html, { runScripts: 'dangerously' });
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(CDN_PREFIX + 'chunk-vendor.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + 'chunk-2.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + 'chunk-3.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = new MemoryFileSystem();
  });
});
