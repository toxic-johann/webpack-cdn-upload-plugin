"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const escapeStringRegexp = require('escape-string-regexp');
const toxic_predicate_functions_1 = require("toxic-predicate-functions");
const nanoid = require("nanoid");
const weblog = require('webpack-log');
const log = weblog({ name: 'webpack-cdn-upload-plugin' });
function replaceFile(file, source, target) {
    return file.replace(new RegExp(escapeStringRegexp(source), 'g'), target);
}
class WebpackCdnUploadPlugin {
    constructor(options = {}) {
        const { upload, replaceAsyncChunkName = false, replaceUrlInCss = true, replaceAssetsInHtml = true, } = options;
        if (!toxic_predicate_functions_1.isFunction(upload)) {
            log.warn('You have not provide an upload function. If you need to upload assets to cdn, please provide an upload function or you can remove webpack-cdn-upload-plugin.');
        }
        this.upload = upload;
        this.replaceAsyncChunkName = replaceAsyncChunkName;
        this.replaceUrlInCss = replaceUrlInCss;
        this.replaceAssetsInHtml = replaceAssetsInHtml;
        // generate a random id to mark the chunkname, so that we can replace it.
        this.uniqueMark = nanoid();
        this.chunksIdUrlMap = {};
        this.chunksNameUrlMap = {};
    }
    apply(compiler) {
        const compilationFn = compilation => {
            if (this.replaceAsyncChunkName) {
                this.markChunkName(compilation);
                // compilation.plugin(['optimize-chunks', 'optimize-extracted-chunks'], (chunks, chunkGroups) => {
                //   // Prevent multiple rename operations
                //   /* istanbul ignore if */
                //   if (compilation[this.uniqueMark]) {
                //     return;
                //   }
                //   compilation[this.uniqueMark] = true;
                //   chunkGroups.forEach(chunkGroup => {
                //     if (chunkGroup.getParents().length) {
                //       chunkGroup.chunks.forEach(chunk => {
                //         chunk.filenameTemplate = this.originChunkFilename;
                //       });
                //     }
                //   });
                // });
                // compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {
                //   htmlPluginData.assets.js = htmlPluginData.assets.js.map(filename => this.chunksNameUrlMap[filename]);
                //   htmlPluginData.assets.css = htmlPluginData.assets.css.map(filename => this.chunksNameUrlMap[filename]);
                //   callback(null, htmlPluginData);
                // });
            }
            if (this.replaceAssetsInHtml) {
                // compilation.plugin('html-webpack-plugin-after-html-processing', async (htmlPluginData, callback) => {
                //   const files = Object.keys(compilation.assets);
                //   let html = htmlPluginData.html;
                //   for (const rawFileName of files) {
                //     const nameWithPublicPath = this.originPublicPath + rawFileName;
                //     if (html.indexOf('"' + nameWithPublicPath) > -1) {
                //       const uploadedUrl = this.chunksNameUrlMap[nameWithPublicPath];
                //       if (uploadedUrl) {
                //         html = replaceFile(html, '"' + nameWithPublicPath, '"' + uploadedUrl);
                //         continue;
                //       }
                //       const url = await this.uploadFile(html, rawFileName);
                //       if (url && isString(url)) {
                //         html = replaceFile(html, '"' + nameWithPublicPath, '"' + url);
                //       }
                //     }
                //   }
                //   htmlPluginData.html = html;
                //   callback(null, htmlPluginData);
                // });
            }
        };
        const emitFn = (compilation) => __awaiter(this, void 0, void 0, function* () {
            if (toxic_predicate_functions_1.isFunction(this.upload)) {
                yield this.uploadAssets(compilation);
            }
        });
        if (compiler.hooks) {
            compiler.hooks['compilation'].tap('webpack-cdn-upload-plugin', compilationFn);
            compiler.hooks['emit'].tap('webpack-cdn-upload-plugin', emitFn);
        }
        else {
            compiler.plugin('this-compilation', compilationFn);
            compiler.plugin('emit', emitFn);
        }
    }
    markChunkName(compilation) {
        console.warn(compilation.outputOptions);
        // if we need to replace async chunk name
        // we will set a mark on its parent chunk source
        const { chunkFilename: originChunkFilename, 
        // publicPath has not default value in webpack4
        publicPath: originPublicPath = '', } = compilation.outputOptions;
        console.warn(originChunkFilename, originPublicPath, compilation.outputOptions);
        this.originChunkFilename = originChunkFilename;
        this.originPublicPath = originPublicPath;
        const chunkFileName = `${this.uniqueMark}[id]${this.uniqueMark}${originChunkFilename}${this.uniqueMark}`;
        console.warn(Object.getOwnPropertyDescriptor(compilation.outputOptions, 'chunkFilename'));
        Object.defineProperty(compilation.outputOptions, 'chunkFilename', {
            value: chunkFileName,
            writable: true,
            // get() {
            //   return chunkFileName;
            // },
            // set() {
            //   /* istanbul ignore next */
            //   console.warn(`chunkFileName is set as ${chunkFileName} by webpack-upload-cdn-plugin, you can't change it`);
            //   /* istanbul ignore next */
            //   return chunkFileName;
            // },
            configurable: true,
            enumerable: true,
        });
    }
    uploadAssets(compilation) {
        return __awaiter(this, void 0, void 0, function* () {
            const { chunkGroups } = compilation;
            const sortedChunkGroups = chunkGroups
                .sort((a, b) => b.getChildren().length - a.getChildren().length);
            while (sortedChunkGroups.length) {
                for (let i = sortedChunkGroups.length - 1; i > -1; i--) {
                    const chunkGroup = sortedChunkGroups[i];
                    // only upload when its childChunk is uploaed
                    const uploadAble = chunkGroup.getChildren().reduce((uploadAble, childChunkGroup) => uploadAble && sortedChunkGroups.indexOf(childChunkGroup) === -1, true);
                    if (!uploadAble)
                        continue;
                    for (const chunk of chunkGroup.chunks) {
                        // if (this.replaceAsyncChunkName) {
                        //   this.replaceAsyncChunkMapOfChunk(chunk, compilation);
                        // }
                        yield this.uploadChunk(chunk, compilation);
                    }
                    sortedChunkGroups.splice(i, 1);
                }
            }
        });
    }
    // if a file has async chunk
    // we need to change its async chunk name before upload
    replaceAsyncChunkMapOfChunk(chunk, compilation) {
        const asyncChunkMap = chunk.chunks.reduce((map, { id }) => {
            /* istanbul ignore if */
            if (!this.chunksIdUrlMap[id]) {
                throw new Error(`We can't find the upload url of chunk ${id}. Please make sure it's uploaded before uploading it's parent chunk`);
            }
            map[id] = this.chunksIdUrlMap[id];
            return map;
        }, {});
        const filename = chunk.files[0];
        const chunkFile = compilation.assets[filename];
        const source = chunkFile.source()
            .replace(new RegExp(`src\\s?=(.*?)"${this.uniqueMark}(.*)${this.uniqueMark}"`, 'g'), (text, $1, $2) => {
            const [chunkIdStr] = $2.split(this.uniqueMark);
            const chunkIdVariable = chunkIdStr.replace(/\s|\+|"/g, '');
            const newText = `src=${JSON.stringify(asyncChunkMap)}[${chunkIdVariable}]`;
            return newText;
        });
        chunkFile.source = () => {
            return source;
        };
    }
    uploadChunk(chunk, compilation) {
        return __awaiter(this, void 0, void 0, function* () {
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
                        if (!rawSource)
                            continue;
                        const source = rawSource.source();
                        const url = yield this.uploadFile(source, rawPath);
                        if (url && toxic_predicate_functions_1.isString(url)) {
                            fileSource = replaceFile(fileSource, '(' + nameWithPublicPath, '(' + url);
                            asset.source = () => fileSource;
                        }
                    }
                }
                yield this.uploadFile(fileSource, filename, chunk);
            }
        });
    }
    uploadFile(source, name, chunk) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = yield this.upload(source, name, chunk);
            const nameWithPublicPath = (this.originPublicPath || '') + name;
            if (chunk) {
                this.chunksIdUrlMap[chunk.id] = url && toxic_predicate_functions_1.isString(url)
                    ? url
                    : this.replaceAsyncChunkName
                        ? nameWithPublicPath
                        : name;
            }
            this.chunksNameUrlMap[nameWithPublicPath] = url || nameWithPublicPath;
            log.info(`"${name}" is uploaded and it will be as "${url || nameWithPublicPath}"`);
            return url;
        });
    }
}
module.exports = WebpackCdnUploadPlugin;
//# sourceMappingURL=index.js.map