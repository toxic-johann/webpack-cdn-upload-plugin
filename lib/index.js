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
        compiler.plugin('this-compilation', compilation => {
            if (this.replaceAsyncChunkName) {
                this.markChunkName(compilation);
                compilation.plugin(['optimize-chunks', 'optimize-extracted-chunks'], (chunks) => {
                    // Prevent multiple rename operations
                    /* istanbul ignore if */
                    if (compilation[this.uniqueMark]) {
                        return;
                    }
                    compilation[this.uniqueMark] = true;
                    chunks.forEach((chunk) => {
                        if (chunk.parents.length) {
                            chunk.filenameTemplate = this.originChunkFilename;
                        }
                    });
                });
                compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {
                    htmlPluginData.assets.js = htmlPluginData.assets.js.map(filename => this.chunksNameUrlMap[filename]);
                    htmlPluginData.assets.css = htmlPluginData.assets.css.map(filename => this.chunksNameUrlMap[filename]);
                    callback(null, htmlPluginData);
                });
            }
            if (this.replaceAssetsInHtml) {
                compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => __awaiter(this, void 0, void 0, function* () {
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
                            const url = yield this.uploadFile(html, rawFileName);
                            if (url && toxic_predicate_functions_1.isString(url)) {
                                html = replaceFile(html, '"' + nameWithPublicPath, '"' + url);
                            }
                        }
                    }
                    htmlPluginData.html = html;
                    callback(null, htmlPluginData);
                }));
            }
        });
        compiler.plugin('emit', (compilation, callback) => __awaiter(this, void 0, void 0, function* () {
            if (toxic_predicate_functions_1.isFunction(this.upload)) {
                yield this.uploadAssets(compilation);
                callback();
            }
            else
                callback();
        }));
    }
    markChunkName(compilation) {
        // if we need to replace async chunk name
        // we will set a mark on its parent chunk source
        const { chunkFilename: originChunkFilename, publicPath: originPublicPath } = compilation.outputOptions;
        this.originChunkFilename = originChunkFilename;
        this.originPublicPath = originPublicPath;
        const chunkFileName = `${this.uniqueMark}[id]${this.uniqueMark}${originChunkFilename}${this.uniqueMark}`;
        Object.defineProperty(compilation.outputOptions, 'chunkFilename', {
            get() {
                return chunkFileName;
            },
            set() {
                /* istanbul ignore next */
                console.warn(`chunkFileName is set as ${chunkFileName} by webpack-upload-cdn-plugin, you can't change it`);
                /* istanbul ignore next */
                return chunkFileName;
            },
            configurable: false,
        });
    }
    uploadAssets(compilation) {
        return __awaiter(this, void 0, void 0, function* () {
            const { chunks } = compilation;
            // sort chunks so that we can upload the async chunk at first
            const sortedChunks = chunks.map(a => a)
                .sort((a, b) => b.chunks.length - a.chunks.length);
            while (sortedChunks.length) {
                for (let i = sortedChunks.length - 1; i > -1; i--) {
                    const chunk = sortedChunks[i];
                    // only upload when its childChunk is uploaed
                    const uploadAble = chunk.chunks.reduce((uploadAble, childChunk) => uploadAble && sortedChunks.indexOf(childChunk) === -1, true);
                    if (!uploadAble)
                        continue;
                    if (this.replaceAsyncChunkName) {
                        this.replaceAsyncChunkMapOfChunk(chunk, compilation);
                    }
                    yield this.uploadChunk(chunk, compilation);
                    sortedChunks.splice(i, 1);
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