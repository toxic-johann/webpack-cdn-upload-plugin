const webpack = require('webpack');
const WebpackCdnUploadPlugin = require('../src/index.ts');
const path = require('path');
const OUTPUT_DIR = path.join(__dirname, 'dist');
const CDN_PREFIX = 'http://cdn.toxicjohann.com/';
// // const nanoid = require('nanoid');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
// const PreloadWebpackPlugin = require('preload-webpack-plugin');
const escapeStringRegexp = require('escape-string-regexp');
// const ToxicWebpackManifestPlugin = require('toxic-webpack-manifest-plugin');
// const mfs = require('fs');
const mfs = require('./helpers/mfs');


describe('base behavior test', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  test('no upload still run', done => {
    const compiler = webpack({
      mode: 'development',
      entry: {
        file: path.join(__dirname, 'fixtures', 'file.js'),
        home: path.join(__dirname, 'fixtures', 'home.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
      },
      plugins: [
        new WebpackCdnUploadPlugin(),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const js = result.compilation.assets['file.js'].source();
      eval(js);
      const scripts = document.head.getElementsByTagName('script');
      expect(scripts.length).toBe(1);
      expect(scripts[0].src).toBe('http://localhost/0.js');
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  test('call upload function for each chunk', done => {
    const fn = jest.fn();
    const fileNames = [];
    const compiler = webpack({
      mode: 'development',
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
      expect(scripts[0].src).toBe('http://localhost/0.js');
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  test('replace url for async chunk', () => {
    let resolveFn;
    const promise = new Promise(resolve => { resolveFn = resolve; });
    const compiler = webpack({
      mode: 'development',
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
      resolveFn();
    });
    compiler.outputFileSystem = mfs;
    return promise;
  });

  test('replace url for multiple chunk', done => {
    const compiler = webpack({
      mode: 'development',
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
      expect(fileNames.includes('vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(js);
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(CDN_PREFIX + '0.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + '1.js')).toBe(true);
      expect(srcs.includes(CDN_PREFIX + 'vendor.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  test('only replace part of url for multiple chunk', done => {
    const compiler = webpack({
      mode: 'development',
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
      expect(fileNames.includes('vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(js);
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(CDN_PREFIX + '0.js')).toBe(true);
      expect(srcs.includes('http://localhost/1.js')).toBe(true);
      expect(srcs.includes('http://localhost/vendor.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  // test('only replace part of url for multiple chunk and support publich path', done => {
  //   const compiler = webpack({
  //     mode: 'development',
  //     entry: {
  //       file: path.join(__dirname, 'fixtures', 'file-a.js'),
  //     },
  //     output: {
  //       path: OUTPUT_DIR,
  //       filename: '[name].js',
  //       publicPath: '/public/',
  //     },
  //     plugins: [
  //       new WebpackCdnUploadPlugin({
  //         upload(content, name) {
  //           if (name !== '0.js') return;
  //           return CDN_PREFIX + name;
  //         },
  //         replaceAsyncChunkName: true,
  //       }),
  //     ],
  //   }, function(error, result) {
  //     expect(error).toBeFalsy();
  //     expect(result.compilation.errors.length).toBe(0);
  //     const js = result.compilation.assets['file.js'].source();
  //     const fileNames = Object.keys(result.compilation.assets);
  //     expect(fileNames.includes('0.js')).toBe(true);
  //     expect(fileNames.includes('1.js')).toBe(true);
  //     expect(fileNames.includes('2.js')).toBe(true);
  //     expect(fileNames.includes('vendor.js')).toBe(true);
  //     expect(fileNames.includes('file.js')).toBe(true);
  //     // fs.writeFileSync('./what.js', js);
  //     eval(js);
  //     const scripts = Array.from(document.head.getElementsByTagName('script'));
  //     expect(scripts.length).toBe(3);
  //     const srcs = scripts.map(({ src }) => src);
  //     expect(srcs.includes(CDN_PREFIX + '0.js')).toBe(true);
  //     expect(srcs.includes('http://localhost/public/1.js')).toBe(true);
  //     expect(srcs.includes('http://localhost/public/vendor.js')).toBe(true);
  //     done();
  //   });
  //   compiler.outputFileSystem = mfs;
  // });

  test('support upload multiple chunk and do not affect publich path in async chunk when we do not replace async chunk name', done => {
    const compiler = webpack({
      mode: 'development',
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
          replaceAsyncChunkName: false,
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
      expect(fileNames.includes('vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(js);
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes('http://localhost/public/0.js')).toBe(true);
      expect(srcs.includes('http://localhost/public/1.js')).toBe(true);
      expect(srcs.includes('http://localhost/public/vendor.js')).toBe(true);
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  test('support replacement on single html-webpack-plugin', done => {
    const compiler = webpack({
      mode: 'development',
      entry: {
        file: path.join(__dirname, 'fixtures', 'file-a.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        chunkFilename: 'chunk-[name].js',
        publicPath: '/public/',
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = result.compilation.assets['index.html'].source();
      const scripts = html.match(/<script.*?script>/g);
      const srcs = scripts.map(script => {
        const [ , src ] = script.match(/src="([^"]*)"/);
        return src;
      });
      expect(srcs[0]).toBe(CDN_PREFIX + 'file.js');
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  test('support replacement on single html-webpack-plugin file with mutiple entry, and we only upload part of it', done => {
    const compiler = webpack({
      mode: 'development',
      entry: {
        file: path.join(__dirname, 'fixtures', 'file.js'),
        home: path.join(__dirname, 'fixtures', 'home.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        chunkFilename: 'chunk-[name].js',
        publicPath: '/public/',
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            if (name === 'home.js') return;
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = result.compilation.assets['index.html'].source();
      const scripts = html.match(/<script.*?script>/g);
      const srcs = scripts.map(script => {
        const [ , src ] = script.match(/src="([^"]*)"/);
        return src;
      });
      expect(srcs[1]).toBe('/public/home.js');
      expect(srcs[0]).toBe(CDN_PREFIX + 'file.js');
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  test('support replacement on single html-webpack-plugin file with mutiple entry', done => {
    const compiler = webpack({
      mode: 'development',
      entry: {
        file: path.join(__dirname, 'fixtures', 'file.js'),
        home: path.join(__dirname, 'fixtures', 'home.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        chunkFilename: 'chunk-[name].js',
        publicPath: '/public/',
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = result.compilation.assets['index.html'].source();
      const scripts = html.match(/<script.*?script>/g);
      const srcs = scripts.map(script => {
        const [ , src ] = script.match(/src="([^"]*)"/);
        return src;
      });
      expect(srcs[1]).toBe(CDN_PREFIX + 'home.js');
      expect(srcs[0]).toBe(CDN_PREFIX + 'file.js');
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  test('support replacement on single html-webpack-plugin file with css', done => {
    const compiler = webpack({
      mode: 'development',
      entry: {
        foo: path.join(__dirname, 'fixtures', '/css/foo.js'),
        bar: path.join(__dirname, 'fixtures', '/css/bar.js'),
      },
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
            use: ExtractTextPlugin.extract({
              fallback: 'style-loader',
              use: 'css-loader',
            }),
          },
        ],
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            if (/bar/.test(name)) return;
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
        new ExtractTextPlugin('[name].css'),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = result.compilation.assets['index.html'].source();
      const scripts = html.match(/<script.*?script>/g);
      const srcs = scripts.map(script => {
        const [ , src ] = script.match(/src="([^"]*)"/);
        return src;
      });
      expect(srcs[0]).toBe(CDN_PREFIX + 'foo.js');
      expect(srcs[1]).toBe('/public/bar.js');
      const styles = html.match(/<link[^>]*>/g);
      const hrefs = styles.map(style => {
        const [ , src ] = style.match(/href="([^"]*)"/);
        return src;
      });
      expect(hrefs[0]).toBe(CDN_PREFIX + 'foo.css');
      expect(hrefs[1]).toBe('/public/bar.css');
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  test('support replacement on single html-webpack-plugin file with image', done => {
    const fileNames = [];
    const compiler = webpack({
      mode: 'development',
      entry: path.join(__dirname, 'fixtures', '/file/index.js'),
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
            use: ExtractTextPlugin.extract({
              fallback: 'style-loader',
              use: 'css-loader',
            }),
          },
          {
            test: /\.(png|jpe?g|gif)$/,
            use: [
              {
                loader: 'file-loader',
                options: {},
              },
            ],
          },
        ],
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            if (/png/.test(name)) return;
            fileNames.push(name);
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceUrlInCss: true,
          replaceAssetsInHtml: true,
        }),
        new ExtractTextPlugin('[name].css'),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      expect(fileNames.join('|').indexOf('jpeg') > -1).toBe(true);
      const css = result.compilation.assets['main.css'].source();
      const cdnRegExpStr = escapeStringRegexp(CDN_PREFIX);
      expect((new RegExp(`url\\(${cdnRegExpStr}.*\.jpeg`)).test(css)).toBe(true);
      expect((new RegExp(`url\\(${cdnRegExpStr}.*\.png`)).test(css)).toBe(false);
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  // test('support preload webpack plugin', done => {
  //   const compiler = webpack({
  //     entry: path.join(__dirname, 'fixtures', '/preload/index.js'),
  //     output: {
  //       path: OUTPUT_DIR,
  //       filename: '[name].js',
  //       chunkFilename: '[name].js',
  //       publicPath: '/public/',
  //     },
  //     plugins: [
  //       new WebpackCdnUploadPlugin({
  //         upload(content, name) {
  //           return CDN_PREFIX + name;
  //         },
  //         replaceAsyncChunkName: true,
  //         replaceAssetsInHtml: true,
  //       }),
  //       new UglifyJsPlugin(),
  //       new HtmlWebpackPlugin(),
  //       new PreloadWebpackPlugin(),
  //     ],
  //   }, function(error, result) {
  //     expect(error).toBeFalsy();
  //     expect(result.compilation.errors.length).toBe(0);
  //     const html = result.compilation.assets['index.html'].source();
  //     expect(html.indexOf('http://cdn.toxicjohann.com/0.js') > -1).toBe(true);
  //     done();
  //   });
  //   compiler.outputFileSystem = mfs;
  // });

  test('support replacement on single html-webpack-plugin file with img in html', done => {
    const compiler = webpack({
      mode: 'development',
      entry: path.join(__dirname, 'fixtures', '/html/index.js'),
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        chunkFilename: '[name].js',
        publicPath: '/public/',
      },
      module: {
        rules: [
          {
            test: /\.(png|jpe?g|gif)$/,
            use: [
              {
                loader: 'file-loader',
                options: {},
              },
            ],
          },
          {
            test: /\.(html)$/,
            use: {
              loader: 'html-loader',
            },
          },
        ],
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: path.join(__dirname, 'fixtures', '/html/index.html'),
        }),
        new WebpackCdnUploadPlugin({
          upload(content, name) {
            if (/png/.test(name)) return;
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
        new ExtractTextPlugin('[name].css'),
      ],
    }, function(error, result) {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = result.compilation.assets['index.html'].source();
      const cdnRegExpStr = escapeStringRegexp(CDN_PREFIX);
      expect((new RegExp(`${cdnRegExpStr}.*\.jpeg`)).test(html)).toBe(true);
      expect((new RegExp(`${cdnRegExpStr}.*\.png`)).test(html)).toBe(false);
      done();
    });
    compiler.outputFileSystem = mfs;
  });

  // test('recursive test', done => {
  //   const compiler = webpack({
  //     entry: {
  //       file: path.join(__dirname, 'fixtures', 'recursive/a.js'),
  //     },
  //     output: {
  //       path: OUTPUT_DIR,
  //       filename: '[name].js',
  //       publicPath: '/public/',
  //     },
  //     plugins: [
  //       new WebpackCdnUploadPlugin({
  //         upload(content, name) {
  //           return CDN_PREFIX + name;
  //         },
  //       }),
  //     ],
  //   }, function(error, result) {
  //     expect(error).toBeFalsy();
  //     expect(result.compilation.errors.length).toBe(0);
  //     const js = result.compilation.assets['file.js'].source();
  //     const fileNames = Object.keys(result.compilation.assets);
  //     // expect(fileNames.includes('0.js')).toBe(true);
  //     // expect(fileNames.includes('1.js')).toBe(true);
  //     // expect(fileNames.includes('2.js')).toBe(true);
  //     // expect(fileNames.includes('3.js')).toBe(true);
  //     // expect(fileNames.includes('file.js')).toBe(true);
  //     // eval(js);
  //     // const scripts = Array.from(document.head.getElementsByTagName('script'));
  //     // expect(scripts.length).toBe(3);
  //     // const srcs = scripts.map(({ src }) => src);
  //     // expect(srcs.includes('/public/0.js')).toBe(true);
  //     // expect(srcs.includes('/public/1.js')).toBe(true);
  //     // expect(srcs.includes('/public/2.js')).toBe(true);
  //     done();
  //   });
  //   compiler.outputFileSystem = mfs;
  // });
});

