/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-var-requires */
import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import MemoryFileSystem from 'memory-fs';

import WebpackCdnUploadPlugin from '../src/index';

const OUTPUT_DIR = path.join(__dirname, 'dist');
const CDN_PREFIX = 'http://cdn.toxicjohann.com/';
const escapeStringRegexp = (value: string) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');

describe('base behavior test', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  test('no upload still run', (done) => {
    const fs = new MemoryFileSystem();
    const compiler = webpack({
      mode: 'development',
      entry: {
        file: path.join(__dirname, 'fixtures', 'file.js'),
        home: path.join(__dirname, 'fixtures', 'home.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        publicPath: '',
      },
      plugins: [new WebpackCdnUploadPlugin()],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.hasErrors()).toBeFalsy();
      eval(fs.readFileSync(path.join(__dirname, 'dist/file.js'), 'utf8'));
      const scripts = document.head.getElementsByTagName('script');
      expect(scripts.length).toBe(1);
      expect(scripts[0].src).toBe('http://localhost/tests_fixtures_module-a_js.js');
      done();
    });
  });

  test('call upload function for each chunk', (done) => {
    const fs = new MemoryFileSystem();
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
        publicPath: '',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload: async (...args) => {
            fn(...args);
            fileNames.push(args[1]);
            return '';
          },
        }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.hasErrors()).toBeFalsy();
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fileNames.includes('tests_fixtures_module-a_js.js')).toBe(true);
      expect(fileNames.includes('home.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(fs.readFileSync(path.join(__dirname, 'dist/file.js'), 'utf8'));
      const scripts = document.head.getElementsByTagName('script');
      expect(scripts.length).toBe(1);
      expect(scripts[0].src).toBe('http://localhost/tests_fixtures_module-a_js.js');
      done();
    });
  });

  test('replace url for async chunk', (done) => {
    const fs = new MemoryFileSystem();
    const compiler = webpack({
      mode: 'development',
      entry: {
        file: path.join(__dirname, 'fixtures', 'file.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        publicPath: '',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload: async (_, name) => {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
        }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('tests_fixtures_module-a_js.js')).toBe(true);
      eval(fs.readFileSync(path.join(__dirname, 'dist/file.js'), 'utf8'));
      const scripts = document.head.getElementsByTagName('script');
      expect(scripts.length).toBe(1);
      expect(scripts[0].src).toBe(`${CDN_PREFIX}tests_fixtures_module-a_js.js`);
      done();
    });
  });

  test('replace url for multiple chunk', (done) => {
    const fs = new MemoryFileSystem();
    const compiler = webpack({
      mode: 'development',
      entry: {
        file: path.join(__dirname, 'fixtures', 'file-a.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        publicPath: '',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload: async (_, name) => {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
        }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('tests_fixtures_file_js.js')).toBe(true);
      expect(fileNames.includes('tests_fixtures_home_js.js')).toBe(true);
      expect(fileNames.includes('tests_fixtures_module-a_js.js')).toBe(true);
      expect(fileNames.includes('vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(fs.readFileSync(path.join(__dirname, 'dist/file.js'), 'utf8'));
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(`${CDN_PREFIX}tests_fixtures_file_js.js`)).toBe(true);
      expect(srcs.includes(`${CDN_PREFIX}tests_fixtures_home_js.js`)).toBe(true);
      expect(srcs.includes(`${CDN_PREFIX}vendor.js`)).toBe(true);
      done();
    });
  });

  test('only replace part of url for multiple chunk', (done) => {
    const fs = new MemoryFileSystem();
    const compiler = webpack({
      mode: 'development',
      entry: {
        file: path.join(__dirname, 'fixtures', 'file-a.js'),
      },
      output: {
        path: OUTPUT_DIR,
        filename: '[name].js',
        publicPath: '',
      },
      plugins: [
        new WebpackCdnUploadPlugin({
          upload: async (_, name) => {
            if (name !== 'tests_fixtures_file_js.js') {
              return '';
            }
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
        }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('tests_fixtures_file_js.js')).toBe(true);
      expect(fileNames.includes('tests_fixtures_home_js.js')).toBe(true);
      expect(fileNames.includes('tests_fixtures_module-a_js.js')).toBe(true);
      expect(fileNames.includes('vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(fs.readFileSync(path.join(__dirname, 'dist/file.js'), 'utf8'));
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes(`${CDN_PREFIX}tests_fixtures_file_js.js`)).toBe(true);
      expect(srcs.includes('http://localhost/tests_fixtures_home_js.js')).toBe(true);
      expect(srcs.includes('http://localhost/vendor.js')).toBe(true);
      done();
    });
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
  //   compiler.outputFileSystem = new MemoryFileSystem();
  // });

  test('support upload multiple chunk and do not affect publich path in async chunk when we do not replace async chunk name', (done) => {
    const fs = new MemoryFileSystem();
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
          upload: async (_, name) => {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: false,
        }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const fileNames = Object.keys(result.compilation.assets);
      expect(fileNames.includes('tests_fixtures_file_js.js')).toBe(true);
      expect(fileNames.includes('tests_fixtures_home_js.js')).toBe(true);
      expect(fileNames.includes('tests_fixtures_module-a_js.js')).toBe(true);
      expect(fileNames.includes('vendor.js')).toBe(true);
      expect(fileNames.includes('file.js')).toBe(true);
      eval(fs.readFileSync(path.join(__dirname, 'dist/file.js'), 'utf8'));
      const scripts = Array.from(document.head.getElementsByTagName('script'));
      expect(scripts.length).toBe(3);
      const srcs = scripts.map(({ src }) => src);
      expect(srcs.includes('http://localhost/public/tests_fixtures_file_js.js')).toBe(true);
      expect(srcs.includes('http://localhost/public/tests_fixtures_home_js.js')).toBe(true);
      expect(srcs.includes('http://localhost/public/vendor.js')).toBe(true);
      done();
    });
  });

  test('support replacement on single html-webpack-plugin', (done) => {
    const fs = new MemoryFileSystem();
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
          upload: async (_, name) => {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = fs.readFileSync(path.join(__dirname, 'dist/index.html'), 'utf8');
      const scripts = (html as string).match(/<script.*?script>/g);
      const srcs = scripts.map((script) => {
        const [, src] = script.match(/src="([^"]*)"/);
        return src;
      });
      expect(srcs[0]).toBe(`${CDN_PREFIX}file.js`);
      done();
    });
  });

  test('support replacement on single html-webpack-plugin file with mutiple entry, and we only upload part of it', (done) => {
    const fs = new MemoryFileSystem();
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
          upload: async (_, name) => {
            if (name === 'home.js') return '';
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = fs.readFileSync(path.join(__dirname, 'dist/index.html'), 'utf8');
      const scripts = (html as string).match(/<script.*?script>/g);
      const srcs = scripts.map((script) => {
        const [, src] = script.match(/src="([^"]*)"/);
        return src;
      });
      expect(srcs[1]).toBe('/public/home.js');
      expect(srcs[0]).toBe(`${CDN_PREFIX}file.js`);
      done();
    });
  });

  test('support replacement on single html-webpack-plugin file with mutiple entry', (done) => {
    const fs = new MemoryFileSystem();
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
          upload: async (_, name) => {
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = fs.readFileSync(path.join(__dirname, 'dist/index.html'), 'utf8');
      const scripts = (html as string).match(/<script.*?script>/g);
      const srcs = scripts.map((script) => {
        const [, src] = script.match(/src="([^"]*)"/);
        return src;
      });
      expect(srcs[1]).toBe(`${CDN_PREFIX}home.js`);
      expect(srcs[0]).toBe(`${CDN_PREFIX}file.js`);
      done();
    });
  });

  test('support replacement on single html-webpack-plugin file with css', (done) => {
    const fs = new MemoryFileSystem();
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
            use: [MiniCssExtractPlugin.loader, 'css-loader'],
          },
        ],
      },
      plugins: [
        new HtmlWebpackPlugin(),
        new WebpackCdnUploadPlugin({
          upload: async (_, name) => {
            if (/bar/.test(name)) return '';
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
        new MiniCssExtractPlugin({ filename: '[name].css' }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = fs.readFileSync(path.join(__dirname, 'dist/index.html'), 'utf8');
      const scripts = (html as string).match(/<script.*?script>/g);
      const srcs = scripts.map((script) => {
        const [, src] = script.match(/src="([^"]*)"/);
        return src;
      });
      expect(srcs[0]).toBe(`${CDN_PREFIX}foo.js`);
      expect(srcs[1]).toBe('/public/bar.js');
      const styles = (html as string).match(/<link[^>]*>/g);
      const hrefs = styles.map((style) => {
        const [, src] = style.match(/href="([^"]*)"/);
        return src;
      });
      expect(hrefs[0]).toBe(`${CDN_PREFIX}foo.css`);
      expect(hrefs[1]).toBe('/public/bar.css');
      done();
    });
  });

  test('support replacement on single html-webpack-plugin file with image', (done) => {
    const fs = new MemoryFileSystem();
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
            use: [MiniCssExtractPlugin.loader, 'css-loader'],
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
          upload: async (_, name) => {
            if (/png/.test(name)) return '';
            fileNames.push(name);
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceUrlInCss: true,
          replaceAssetsInHtml: true,
        }),
        new MiniCssExtractPlugin({ filename: '[name].css' }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      expect(fileNames.join('|').indexOf('jpeg') > -1).toBe(true);
      const css = fs.readFileSync(path.join(__dirname, 'dist/main.css'), 'utf8');
      const cdnRegExpStr = escapeStringRegexp(CDN_PREFIX);
      expect(new RegExp(`url\\(${cdnRegExpStr}.*\.jpeg`).test(css as string)).toBe(true);
      expect(new RegExp(`url\\(${cdnRegExpStr}.*\.png`).test(css as string)).toBe(false);
      done();
    });
  });

  test('support replacement on single html-webpack-plugin file with img in html', (done) => {
    const fs = new MemoryFileSystem();
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
          upload: async (_, name) => {
            if (/png/.test(name)) return '';
            return CDN_PREFIX + name;
          },
          replaceAsyncChunkName: true,
          replaceAssetsInHtml: true,
        }),
        new MiniCssExtractPlugin({ filename: '[name].css' }),
      ],
    });
    compiler.outputFileSystem = fs;
    compiler.run((error, result) => {
      expect(error).toBeFalsy();
      expect(result.compilation.errors.length).toBe(0);
      const html = fs.readFileSync(path.join(__dirname, 'dist/index.html'), 'utf8');
      const cdnRegExpStr = escapeStringRegexp(CDN_PREFIX);
      expect(new RegExp(`${cdnRegExpStr}.*\.jpeg`).test(html as string)).toBe(true);
      expect(new RegExp(`${cdnRegExpStr}.*\.png`).test(html as string)).toBe(false);
      done();
    });
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
  //   compiler.outputFileSystem = new MemoryFileSystem();
  // });
});
