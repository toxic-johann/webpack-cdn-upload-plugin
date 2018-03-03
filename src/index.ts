const escapeStringRegexp = require('escape-string-regexp');
import { isString, isFunction } from 'toxic-predicate-functions';
import * as nanoid from 'nanoid';
const weblog = require('webpack-log');

const PLUGIN_NAME = 'webpack-cdn-upload-plugin';
const log = weblog({ name: PLUGIN_NAME });

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
    const {
      upload,
      replaceAsyncChunkName = false,
      replaceUrlInCss = true,
      replaceAssetsInHtml = true,
    } = options;
    if (!isFunction(upload)) {
      log.warn(`You have not provide an upload function. If you need to upload assets to cdn, please provide an upload function or you can remove ${PLUGIN_NAME}.`);
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

  apply(compiler) {
    const compilationFn = compilation => {
      if (this.replaceAsyncChunkName) {
        this.markChunkName(compilation);

        const originGetPath = compilation.getPath;
        const self = this;

        Object.defineProperty(compilation, 'getPath', {
          value(...args) {
            const filenameTemplate: string = args.shift();
            const filterFilenameTemplate = self.restoreChunkName(filenameTemplate);
            args.unshift(filterFilenameTemplate);
            return originGetPath.bind(this)(...args);
          },
          writable: true,
          enumerable: false,
          configurable: true,
        });
      }

      if (this.replaceAssetsInHtml && compilation.hooks.htmlWebpackPluginAfterHtmlProcessing) {
        const afterHtmlProcessFn = async (htmlPluginData, callback) => {
          const files = Object.keys(compilation.assets);
          let html = htmlPluginData.html;
          for (const rawFileName of files) {
            const nameWithPublicPath = this.originPublicPath + rawFileName;
            if (html.indexOf('"' + nameWithPublicPath) > -1) {
              const uploadedUrl = this.chunksNameUrlMap[nameWithPublicPath];
              if (uploadedUrl) {
                html = replaceFile(html, '"' + nameWithPublicPath, '"' + uploadedUrl);
                continue;
              }

              const url = await this.uploadFile(html, rawFileName);
              if (url && isString(url)) {
                html = replaceFile(html, '"' + nameWithPublicPath, '"' + url);
              }
            }
          }

          htmlPluginData.html = html;
          callback(null, htmlPluginData);
        };

        compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapAsync(PLUGIN_NAME, afterHtmlProcessFn);
      }
    };

    const emitFn = async compilation => {
      if (isFunction(this.upload)) {
        await this.uploadAssets(compilation);
      }
    };

    if (compiler.hooks) {
      compiler.hooks['compilation'].tap(PLUGIN_NAME, compilationFn);
      compiler.hooks['emit'].tap(PLUGIN_NAME, emitFn);
    } else {
      compiler.plugin('this-compilation', compilationFn);

      compiler.plugin('emit', emitFn);
    }
  }

  markChunkName(compilation) {
    // if we need to replace async chunk name
    // we will set a mark on its parent chunk source
    const {
      chunkFilename: originChunkFilename,
      // publicPath has not default value in webpack4
      publicPath: originPublicPath = '',
    } = compilation.outputOptions;
    this.originChunkFilename = originChunkFilename;
    this.originPublicPath = originPublicPath;
    let chunkFileName = `${this.uniqueMark}[id]${this.uniqueMark}${originChunkFilename}${this.uniqueMark}`;
    compilation.outputOptions.chunkFilename = chunkFileName;
    Object.defineProperty(compilation.outputOptions, 'chunkFilename', {
      get() {
        return chunkFileName;
      },
      set(value) {
        chunkFileName = value;
        return chunkFileName;
      },
      configurable: true,
      enumerable: true,
    });
  }

  async uploadAssets(compilation) {
    const { chunkGroups } = compilation;

    const sortedChunkGroups = chunkGroups
      .sort((a, b) => b.getChildren().length - a.getChildren().length);
    while (sortedChunkGroups.length) {
      for (let i = sortedChunkGroups.length - 1; i > -1;i--) {
        const chunkGroup = sortedChunkGroups[i];

        // only upload when its childChunk is uploaed
        const uploadAble = chunkGroup.getChildren().reduce((uploadAble, childChunkGroup) => uploadAble && sortedChunkGroups.indexOf(childChunkGroup) === -1, true);
        if (!uploadAble) continue;

        for (const chunk of chunkGroup.chunks) {
          await this.uploadChunk(chunk, compilation);
        }

        if (this.replaceAsyncChunkName) {
          this.replaceAsyncChunkMapOfChunk(chunkGroup, compilation);
        }

        sortedChunkGroups.splice(i, 1);
      }
    }
  }

  restoreChunkName(name: string) {
    return name
      .replace(new RegExp(`${this.uniqueMark}(.*?)${this.uniqueMark}`, 'g'), '')
      .replace(new RegExp(this.uniqueMark, 'g'), '');
  }

  // if a file has async chunk
  // we need to change its async chunk name before upload
  replaceAsyncChunkMapOfChunk(chunkGroup, compilation) {
    const childrenChunkGroups = chunkGroup.getChildren();
    const asyncChunkMap = childrenChunkGroups.reduce((map, chunkGroup) => {
      chunkGroup.chunks.forEach(({ id }) => {
        /* istanbul ignore if */
        if (!this.chunksIdUrlMap[id]) {
          throw new Error(`We can't find the upload url of chunk ${id}. Please make sure it's uploaded before uploading it's parent chunk`);
        }
        map[id] = this.chunksIdUrlMap[id];
      });
      return map;
    }, {});
    chunkGroup.chunks.forEach(chunk => {
      const filename = chunk.files[0];
      const chunkFile = compilation.assets[filename];
      const source = chunkFile.source()
        .replace(new RegExp(`src\\s?=(.*?)"${this.uniqueMark}(.*)${this.uniqueMark}"`, 'g'), (text, $1, $2) => {
          const [ chunkIdStr ] = $2.split(this.uniqueMark);
          const chunkIdVariable = chunkIdStr.replace(/\s|\+|"/g, '');
          const newText = `src=${JSON.stringify(asyncChunkMap)}[${chunkIdVariable}]`;
          return newText;
        });
      chunkFile.source = () => {
        return source;
      };
    });
  }

  async uploadChunk(chunk, compilation) {
    for (const filename of chunk.files) {
      const asset = compilation.assets[filename];
      let fileSource = asset.source();
      if (this.replaceUrlInCss && /.css$/.test(filename)) {
        const urls = fileSource.match(/url\((.*?)\)/g) || [];
        for (const urlStr of urls) {
          const nameWithPublicPath = urlStr.slice(4, -1);
          const uploadedUrl = this.chunksNameUrlMap[nameWithPublicPath];
          // if we have upload this path, and we have the file
          // we use it
          if (uploadedUrl) {
            fileSource = replaceFile(fileSource, '(' + nameWithPublicPath, '(' + uploadedUrl);
            asset.source = () => fileSource;
            continue;
          }
          const rawPath = nameWithPublicPath.replace(this.originPublicPath, '');
          const rawSource = compilation.assets[rawPath];
          // sometimes it maybe inline base64
          if (!rawSource) continue;

          const source = rawSource.source();
          const url = await this.uploadFile(source, rawPath);
          if (url && isString(url)) {
            fileSource = replaceFile(fileSource, '(' + nameWithPublicPath, '(' + url);
            asset.source = () => fileSource;
          }
        }
      }
      await this.uploadFile(fileSource, filename, chunk);
    }
  }

  async uploadFile(source: string, name: string, chunk?) {
    const url = await this.upload(source, name, chunk);
    const nameWithPublicPath = (this.originPublicPath || '') + name;
    if (chunk) {
      this.chunksIdUrlMap[chunk.id] = url && isString(url)
        ? url
        : this.replaceAsyncChunkName
          ? nameWithPublicPath
          : name;
    }
    this.chunksNameUrlMap[nameWithPublicPath] = url || nameWithPublicPath;
    log.info(`"${name}" is uploaded and it will be as "${url || nameWithPublicPath }"`);
    return url;
  }
}

module.exports = WebpackCdnUploadPlugin;
