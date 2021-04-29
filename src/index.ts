/* eslint-disable no-loop-func, no-await-in-loop, no-continue, no-param-reassign, no-restricted-syntax, no-shadow, max-len, no-plusplus, no-nested-ternary, func-names  */
import { isString, isFunction } from 'lodash';
import { nanoid } from 'nanoid';
import { Compiler, Compilation, Chunk } from 'webpack';
import { CachedSource } from 'webpack-sources';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import weblog from 'webpack-log';

const PLUGIN_NAME = 'webpack-cdn-upload-plugin';
const log = weblog({ name: PLUGIN_NAME, level: process.env.DEBUG ? 'debug' : 'warn' });
const escapeStringRegexp = (value: string) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');

function replaceFile(file: string, source: string, target: string) {
  return file.replace(new RegExp(escapeStringRegexp(source), 'g'), target);
}

interface Options {
  upload?: Function;
  replaceAsyncChunkName?: boolean;
  replaceUrlInCss?: boolean;
  replaceAssetsInHtml?: boolean;
}

class WebpackCdnUploadPlugin {
  rename: Function | undefined | string;

  upload: Function;

  replaceAsyncChunkName: boolean;

  replaceUrlInCss: boolean;

  replaceAssetsInHtml: boolean;

  uniqueMark: string;

  chunksIdUrlMap: { [key: string]: string };

  chunksNameUrlMap: { [key: string]: string };

  originChunkFilename: string;

  originPublicPath: string;

  constructor(options: Options = {}) {
    const { upload, replaceAsyncChunkName = false, replaceUrlInCss = true, replaceAssetsInHtml = false } = options;
    if (!isFunction(upload)) {
      log.warn(
        `You have not provide an upload function. If you need to upload assets to cdn, please provide an upload function or you can remove ${PLUGIN_NAME}.`,
      );
    }
    this.upload = upload;
    this.replaceAsyncChunkName = replaceAsyncChunkName;
    this.replaceUrlInCss = replaceUrlInCss;
    this.replaceAssetsInHtml = replaceAssetsInHtml;
    // generate a random id to mark the chunkname, so that we can replace it.
    this.uniqueMark = `${nanoid()}-set-by-${PLUGIN_NAME}`;
    this.chunksIdUrlMap = {};
    this.chunksNameUrlMap = {};
  }

  apply(compiler: Compiler) {
    /* istanbul ignore if  */
    if (!compiler.hooks) {
      const message = `The webpack you used do not support compiler hooks. Please install ${PLUGIN_NAME}@0`;
      log.error(message);
      throw new Error(message);
    }
    compiler.hooks.afterPlugins.tap(PLUGIN_NAME, (compiler) => {
      if (this.replaceAsyncChunkName) {
        this.markChunkName(compiler);
      }
    });
    compiler.hooks.compilation.tap(PLUGIN_NAME, (...args) => {
      this.compilationFn.call(this, compiler, ...args);
    });
    compiler.hooks.emit.tap(PLUGIN_NAME, this.emitFn.bind(this));
  }

  compilationFn(_: Compiler, compilation: Compilation) {
    if (this.replaceAssetsInHtml) {
      const beforeEmit = HtmlWebpackPlugin.getHooks(compilation).beforeEmit;
      /* istanbul ignore if  */
      if (!beforeEmit) {
        const message = `We can't find HtmlWebpackPlugin.getHooks(compilation).beforeEmit (beforeEmit hook) in this webpack. If you do not use html-webpack-plugin, please set replaceAssetsInHtml as false. If you use html-webpack-plugin, please use it before ${PLUGIN_NAME}`;
        log.error(message);
        throw new Error(message);
      }
      const afterHtmlProcessFn = async (htmlPluginData, callback) => {
        const files = Object.keys(compilation.assets);
        let { html } = htmlPluginData;
        for (const rawFileName of files) {
          const nameWithPublicPath = this.originPublicPath + rawFileName;
          const nameWithPublicPathRegExp = new RegExp(
            `${escapeStringRegexp(this.originPublicPath)}((${this.uniqueMark})+.+${
              this.uniqueMark
            })?${escapeStringRegexp(rawFileName)}((${this.uniqueMark})+)?`,
          );
          const match = html.match(nameWithPublicPathRegExp);
          if (match) {
            const uploadedUrl = this.chunksNameUrlMap[nameWithPublicPath];
            /* istanbul ignore if  */
            if (uploadedUrl) {
              html = replaceFile(html, `"${match[0]}`, `"${uploadedUrl}`);
              continue;
            }

            const url = await this.uploadFile(html, rawFileName);
            if (url && isString(url)) {
              html = replaceFile(html, `"${match[0]}`, `"${url}`);
            }
          }
        }

        htmlPluginData.html = html;
        callback(null, htmlPluginData);
      };

      beforeEmit.tapAsync(PLUGIN_NAME, afterHtmlProcessFn);
    }
  }

  async emitFn(compilation: Compilation) {
    if (isFunction(this.upload)) {
      await this.uploadAssets(compilation);
    }
  }

  markChunkName(compiler: Compiler) {
    // if we need to replace async chunk name
    // we will set a mark on its parent chunk source
    const {
      chunkFilename: originChunkFilename,
      // publicPath has not default value in webpack4
      publicPath: originPublicPath = '',
    } = compiler.options.output;
    this.originChunkFilename = originChunkFilename as string;
    this.originPublicPath = originPublicPath as string;
    compiler.options.output.chunkFilename = `${this.uniqueMark}${originChunkFilename}${this.uniqueMark}`;
  }

  async uploadAssets(compilation: Compilation) {
    const { chunks, entrypoints } = compilation;

    for (const chunk of chunks) {
      await this.uploadChunk(chunk, compilation);
    }
    if (this.replaceAsyncChunkName) {
      for (const entry of entrypoints.values()) {
        for (const chunk of chunks) {
          if (chunk.id === entry.id) {
            const filename = Array.from(chunk.files)[0];
            const chunkFile = compilation.getAsset(filename).source;
            const original = chunkFile.source() as string;
            const source = original.replace(
              new RegExp(String.raw`return "${this.uniqueMark}.*${this.uniqueMark}";`, 'g'),
              (_) => {
                return `return (${JSON.stringify(this.chunksIdUrlMap)})[arguments[0]]`;
              },
            );
            chunkFile.buffer = () => {
              return Buffer.from(source);
            }
            break;
          }
        }
      }
    }
  }

  async uploadChunk(chunk: Chunk, compilation: Compilation) {
    // for (const originFilename of chunk.files) {
    for (const filename of chunk.files) {
      // const filename = this.restoreChunkName(originFilename);
      const asset = compilation.getAsset(filename).source;
      let fileSource = asset.source() as string;
      if (this.replaceUrlInCss && /.css$/.test(filename)) {
        const urls = fileSource.match(/url\((.*?)\)/g) || [];
        for (const urlStr of urls) {
          const nameWithPublicPath = urlStr.slice(4, -1);
          const uploadedUrl = this.chunksNameUrlMap[nameWithPublicPath];
          // if we have upload this path, and we have the file
          // we use it
          if (uploadedUrl) {
            fileSource = replaceFile(fileSource, `(${nameWithPublicPath}`, `(${uploadedUrl}`);
            asset.source = () => fileSource;
            continue;
          }
          const rawPath = nameWithPublicPath.replace(this.originPublicPath, '');
          const rawSource = compilation.assets[rawPath];
          // sometimes it maybe inline base64
          /* istanbul ignore if  */
          if (!rawSource) continue;

          const source = rawSource.source() as string;
          const url = await this.uploadFile(source, rawPath);
          if (url && isString(url)) {
            fileSource = replaceFile(fileSource, `(${nameWithPublicPath}`, `(${url}`);
            asset.source = () => fileSource;
          }
        }
      }
      await this.uploadFile(fileSource, filename, chunk);
    }
  }

  async uploadFile(source: string, name: string, chunk?: Chunk) {
    const url = await this.upload(source, name, chunk);
    const nameWithPublicPath = (this.originPublicPath || '') + name;
    if (chunk) {
      this.chunksIdUrlMap[chunk.id] =
        url && isString(url) ? url : this.replaceAsyncChunkName ? nameWithPublicPath : name;
    }
    this.chunksNameUrlMap[nameWithPublicPath] = url || nameWithPublicPath;
    log.info(`"${name}" is uploaded and it will be as "${url || nameWithPublicPath}"`);
    return url;
  }
}

export { WebpackCdnUploadPlugin };
