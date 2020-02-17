# webpack-cdn-upload-plugin

[![Build Status](https://img.shields.io/travis/toxic-johann/webpack-cdn-upload-plugin/master.svg?style=flat-square)](https://travis-ci.org/toxic-johann/webpack-cdn-upload-plugin.svg?branch=master)
[![Coverage Status](https://img.shields.io/coveralls/toxic-johann/webpack-cdn-upload-plugin/master.svg?style=flat-square)](https://coveralls.io/github/toxic-johann/webpack-cdn-upload-plugin?branch=master)
[![npm](https://img.shields.io/npm/v/webpack-cdn-upload-plugin.svg?colorB=brightgreen&style=flat-square)](https://www.npmjs.com/package/webpack-cdn-upload-plugin)
[![dependency Status](https://david-dm.org/toxic-johann/webpack-cdn-upload-plugin.svg)](https://david-dm.org/toxic-johann/webpack-cdn-upload-plugin)
[![devDependency Status](https://david-dm.org/toxic-johann/webpack-cdn-upload-plugin/dev-status.svg)](https://david-dm.org/toxic-johann/webpack-cdn-upload-plugin?type=dev) [![Greenkeeper badge](https://badges.greenkeeper.io/toxic-johann/webpack-cdn-upload-plugin.svg)](https://greenkeeper.io/)


> A powerful webpack plugin which can help you to upload your assets into cdn.

English | [中文](https://github.com/toxic-johann/webpack-cdn-upload-plugin/blob/master/README-zh.md)

## Introduction

`webpack-cdn-upload-plugin` is helpful if you want to upload  assets packed by webpack to cdn.

You just need to provide an upload function for your cdn, and then the plugin will finish all the other job.

What's more, it can change asynchronous chunk name, url link in css file and all link in HTML file.

It's compatible with `html-webpack-plugin`, `preload-webpack-plugin`, `uglifyJsPlugin`,  `css-loader`, `file-loader` and more.

## Install

If you are using webpack 4, you can install the latest  version.

```shell
$ npm install webpack-cdn-upload-plugin --save-dev
```

If you want to use webpack 3 compatible version, you can install like this.

```sh
$ npm install webpack-cdn-upload-plugin@0 --save-dev
```

## Usage

First of all, you need to offer us an upload function, which is look like this

```typescript
async function upload(content: string, name: string, chunk?: Object): string | undefined {
    // do some upload job here
    // if you need to customize the chunk link
    // you need to return the new url.
    return url;
}
```

### Use public path to set our cdn url

In most case, we do not need to customize our cdn url. We can use `publicPath`.

You can set your webpack config like this.

```javascript
{
  entry: path.join(__dirname, 'index.js'),
  output: {
    path: OUTPUT_DIR,
    filename: '[name].js',
    chunkFilename: 'chunk-[name].js',
    publicPath: 'http://cdn.toxicjohann.com/',
  },
  mode: 'development',
  plugins: [
    new WebpackCdnUploadPlugin({
      new HtmlWebpackPlugin(),
      upload(content, name) {
        // do some upload stuff here
      },
    }),
  ],
}
```

It will generate html below. And at the same time,  you file will be uploaded.

```html
<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Webpack App</title>
      </head>
      <body>
          <script type="text/javascript" src="http://cdn.toxicjohann.com/main.js"></script>
      </body>
    </html>
```

### Upload some file in css

You may import some file in css, such as font, image. It will be handeled by `file-loader` and it's not treated as chunk.

What if you want to upload that file too?

You just need to turn on `replaceUrlInCss` flag.

Let's assume you have an css file below, and it's imported by `index.js`.

```css
body {
  background-image: url('./doggy.jpeg');
}
```

So we can set the webpack config like this.

```javascript
{
  entry: path.join(__dirname, 'index.js'),
  output: {
    path: OUTPUT_DIR,
    filename: '[name].js',
    chunkFilename: 'chunk-[name].js',
    publicPath: 'http://cdn.toxicjohann.com/',
  },
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin(),
    new WebpackCdnUploadPlugin({
      upload(content, name) {
        // do some upload stuff here
      },
      replaceUrlInCss: true,
    }),
  ],
}
```

It will also upload the `doggy.jpeg`. And generate css below.

```css
body {
      background-image: url(http://cdn.toxicjohann.com/6fa90a9f47fd74fb99530864adbe95d4.jpeg);
}
```

And the html look like this.

```html
<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Webpack App</title>
      <link href="http://cdn.toxicjohann.com/main.css" rel="stylesheet"></head>
      <body>
          <script type="text/javascript" src="http://cdn.toxicjohann.com/main.js"></script>
      </body>
</html>
```

### Upload file include by HTML

Sometimes we will include file in html. We handle this by the `html-loader` and the `file-loader`.

If you want to upload file like this, you need to turn on the `replaceAssetsInHtml` flag.

Let's assume you have html file like this as template.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
</head>
<body>
  <img src="./doggy.jpeg" />
</body>
</html>
```

And you turn on the `replaceAssetsInHtml` flag.

```javascript
{
  entry: path.join(__dirname, 'fixtures', '/html/index.js'),
  output: {
    path: OUTPUT_DIR,
    filename: '[name].js',
    chunkFilename: '[name].js',
    publicPath: 'http://cdn.toxicjohann.com/',
  },
  mode: 'production',
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
          // do some upload job here
      },
      replaceAssetsInHtml: true,
    }),
    new ExtractTextPlugin('[name].css'),
  ],
}
```

And the html will look like this.

```html
<!DOCTYPE html>
<html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>Document</title>
    </head>
    <body>
      <img src="http://cdn.toxicjohann.com/6fa90a9f47fd74fb99530864adbe95d4.jpeg" />
    <script type="text/javascript" src="http://cdn.toxicjohann.com/main.js"></script></body>
</html>
```

### Custom url

In some case, you may need to upload to different cdn or the cdn would not keep your filename.

In this case, you need to return the new url in your upload function. You can set the webpack config like this.

```javascript
{
  entry: path.join(__dirname, 'index.js'),
  output: {
    path: OUTPUT_DIR,
    filename: '[name].js',
    chunkFilename: 'chunk-[name].js',
    publicPath: 'http://another-cdn.com',
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new WebpackCdnUploadPlugin({
      upload(content, name) {
        // do some upload stuff here
        return 'http://cdn.toxicjohann.com/' + name;
      },
    }),
  ],
}
```

And the html will look like this.

```html
<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Webpack App</title>
      <link href="http://cdn.toxicjohann.com/main.css" rel="stylesheet"></head>
      <body>
          <script type="text/javascript" src="http://cdn.toxicjohann.com/main.js"></script>
      </body>
</html>
```

### Rename the asynchronous chunk

You may find the asynchronous chunk do not use the cdn version. That's because we have not rename the asynchronous chunk in the javascript file.

If you do not use public path to set your cdn url, you need to turn on the `renameAsyncChunkName` flag to tell us that you need to rename the asynchronous chunk.

Let's assume you have javascript like this.

```javascript
console.log('lol');
import('./module-a.js');
```

And we need to set the webpack config like this.

```javascript
{
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
        return 'http://cdn.toxicjohann.com/' + name;
      },
      replaceAsyncChunkName: true,
    }),
  ],
}
```

In this mode, it will rename the asynchronous chunk of the `file.js`. After the script is executed, the document head will look like this.

```html
<script type="text/javascript" charset="utf-8" src="http://cdn.toxicjohann.com/0.js"></script>
```

Which it's useful.

## Options

There are several options.

### upload

An upload function to upload the assets into cdn. If you need to customize your cdn url, please return a string.

```typescript
async function upload(content: string, name: string, chunk?: Object): string | undefined {
    // do some upload job here
    // if you need to customize the chunk link
    // you need to return the new url.
    return url;
}
```

You will get the content of a file, the file name as parameter. If it's a chunk, you can get a chunk object.

### replaceAsyncChunkName

* type: `boolean`
* default: `false`

When you need to customize the asynchronous chunk name, you need to turn on this flag. We will replace its name as what you returned.

### replaceUrlInCss

- type: `boolean`
- default: `true`

We will check all the css file and upload the file included by url if this flag is `true`.

### replaceAssetsInHtml

- type: `boolean`
- default: `false`

We will check all the html file and upload the file included by `script`, `link` and more.

> When you are using `webpack-cdn-upload-plugin` in webpack 4 with replaceAssetsInHtml as true. You must make sure you have use `html-webpack-plugin` before `webpack-cdn-upload-plugin`.

Support
-------

If you've found an error in this sample, please file an issue:
[https://github.com/googlechrome/preload-webpack-plugin/issues](https://github.com/toxic-johann/webpack-cdn-upload-plugin/issues)

Patches are encouraged, and may be submitted by forking this project and
submitting a pull request through GitHub.

Contributing workflow
---------------------

`src/index.ts` contains the primary source for the plugin, `test` contains tests.

Test the plugin:

```sh
$ npm install
$ npm t
```

Lint the plugin:

```sh
$ npm run lint
```

The project is written in TypeScript, so it need a build step.

Build the file

```sh
$ npm run build
```

### Donation

You can donation to us, that will help us keep moving.

![image](https://user-images.githubusercontent.com/2577157/74649176-0a7db980-51ba-11ea-9db4-4dea2e72c6be.png)
