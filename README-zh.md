# webpack-cdn-upload-plugin

[![Build Status](https://img.shields.io/travis/toxic-johann/webpack-cdn-upload-plugin/master.svg?style=flat-square)](https://travis-ci.org/toxic-johann/webpack-cdn-upload-plugin.svg?branch=master)
[![Coverage Status](https://img.shields.io/coveralls/toxic-johann/webpack-cdn-upload-plugin/master.svg?style=flat-square)](https://coveralls.io/github/toxic-johann/webpack-cdn-upload-plugin?branch=master)
[![npm](https://img.shields.io/npm/v/webpack-cdn-upload-plugin.svg?colorB=brightgreen&style=flat-square)](https://www.npmjs.com/package/webpack-cdn-upload-plugin)
[![dependency Status](https://david-dm.org/toxic-johann/webpack-cdn-upload-plugin.svg)](https://david-dm.org/toxic-johann/webpack-cdn-upload-plugin)
[![devDependency Status](https://david-dm.org/toxic-johann/webpack-cdn-upload-plugin/dev-status.svg)](https://david-dm.org/toxic-johann/webpack-cdn-upload-plugin?type=dev)


> 一个用于上传静态文件到 cdn 的 webpack 插件。

[English](https://github.com/toxic-johann/webpack-cdn-upload-plugin/blob/master/README.md) | 中文

## 简介

`webpack-cdn-upload-plugin` 可以帮助你使用 webpack 上传静态资源到 cdn 。你只需要提供一个上传函数即可。同时，它还能与`html-webpack-plugin`, `preload-webpack-plugin`, `uglifyJsPlugin`,  `css-loader`, `file-loader` 等插件协同工作。

## 安装

如果你正在使用 webpack 4, 请按照以下方式安装。

```shell
$ npm install webpack-cdn-upload-plugin --save-dev
```

如果你希望使用 webpack 3，请安装旧版本。

```shell
$ npm install webpack-cdn-upload-plugin@0 --save-dev
```

## 用法

首先，你需要提供符合以下要求的上传函数。

```typescript
async function upload(content: string, name: string, chunk?: Object): string | undefined {
    // 在此处完成上传的工作，如果需要自定义 cdn 地址，则需要返回地址。
    return url;
}
```

### 使用 public path 设置 cdn 地址

大多数情况下，我们可以使用  `publicPath` 来设定我们的 cdn 地址前缀。

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
        // 在此处完成上传的工作
      },
    }),
  ],
}
```

它会自动完成文件上传，并生成如下 html。

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

### 上传 css 引入的静态资源。

你可能会在 css 中引入如图片、字体等静态资源。他们通常会有 `file-loader` 进行处理，所以不会被视作一个 chunk 。

如果我们需要上传这些资源，需要打开  `replaceUrlInCss`  开关。

假设我们的 css 形如下方：

```css
body {
  background-image: url('./doggy.jpeg');
}
```

那么我们可以配置 webpack 如下：

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
        // 在此处完成上传的工作
      },
      replaceUrlInCss: true,
    }),
  ],
}
```

它会上传该图片并生成 css 文件如下：

```css
body {
      background-image: url(http://cdn.toxicjohann.com/6fa90a9f47fd74fb99530864adbe95d4.jpeg);
}
```

而 html 文件如下：

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

### 上传 html 中引入的文件

我们也会通过 html 引入静态文件。这些文件我们一般会使用 `html-loader` 和 `file-loader` 进行处理。

如果你需要上传这些文件，你需要打开 `replaceAssetsInHtml`  开关。

假设我们的 html 模版如下：

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

我们配置 webpack 如下

```javascript
{
  entry: path.join(__dirname, 'fixtures', '/html/index.js'),
  output: {
    path: OUTPUT_DIR,
    filename: '[name].js',
    chunkFilename: '[name].js',
    publicPath: 'http://cdn.toxicjohann.com/',
  },
  mode: 'prooduction',
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
          // 在此处完成上传的工作
      },
      replaceAssetsInHtml: true,
    }),
    new ExtractTextPlugin('[name].css'),
  ],
}
```

最终会生成如下 html

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

### 自定义地址

有几种情况你可能会需要自定义地址。比如你可能需要将不同文件上传到不同 cdn，又或者你的 cdn 不支持文件命名。

这种情况下，我们需要将新的地址通过上传函数返回，配置如下：

```javascript
{
  entry: path.join(__dirname, 'index.js'),
  output: {
    path: OUTPUT_DIR,
    filename: '[name].js',
    chunkFilename: 'chunk-[name].js',
    publicPath: 'http://another-cdn.com',
  },
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin(),
    new WebpackCdnUploadPlugin({
      upload(content, name) {
        // 进行上传工作并返回地址
        return 'http://cdn.toxicjohann.com/' + name;
      },
    }),
  ],
}
```

最终生成结果如下：

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

### 重新命名异步加载的 bundle

你可能会发现，你的异步加载 bundle 并没有使用你自定义的 cdn 地址。这是因为异步加载的 bundle 需要通过修改原 javascript 文件来替换地址。

此时，你需要打开 `renameAsyncChunkName`  开关。

假设你引入了一个动态模块，并且需要定制 cdn 地址。

```javascript
console.log('lol');
import('./module-a.js');
```

配置如下：

```javascript
{
  entry: {
    file: path.join(__dirname, 'fixtures', 'file.js'),
  },
  output: {
    path: OUTPUT_DIR,
    filename: '[name].js',
  },
  mode: 'development',
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

这样子，我们就能替换你的异步加载 bundle，最终他的执行效果如下。

```html
<script type="text/javascript" charset="utf-8" src="http://cdn.toxicjohann.com/0.js"></script>
```

## 配置参数

配置参数如下：

### upload

上传函数是用于将你的文件上传到 cdn，如果你需要自定义 cdn 地址，则在结果处返回你的 cdn 地址。

```typescript
async function upload(content: string, name: string, chunk?: Object): string | undefined {
    // do some upload job here
    // if you need to customize the chunk link
    // you need to return the new url.
    return url;
}
```

你会接受到文件内容和文件名，如果该文件是一个 chunk， 你还会接受到 chunk 对象。

### replaceAsyncChunkName

* 类型: `boolean`
* 默认: `false`

打开此开关，我们会将异步加载的 bundle 地址替换为你自定义的地址。

### replaceUrlInCss

- 类型: `boolean`
- 默认: `true`

打开此开关，我们会检查 css 文件并将 url 中的 静态文件上传。

### replaceAssetsInHtml

- 类型: `boolean`
- 默认: `false`

打开此地址，我们会检查 html 文件，并将 url 中的静态文件上传。

> 使用此方式时，请确保 html-webpack-plugin 置于 webpack-cdn-upload-plugin 前。