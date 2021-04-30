"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-loop-func, no-await-in-loop, no-continue, no-param-reassign, no-restricted-syntax, no-shadow, max-len, no-plusplus, no-nested-ternary, func-names  */
const lodash_1 = require("lodash");
const nanoid_1 = require("nanoid");
const webpack_1 = require("webpack");
const html_webpack_plugin_1 = __importDefault(require("html-webpack-plugin"));
const webpack_log_1 = __importDefault(require("webpack-log"));
const PLUGIN_NAME = 'webpack-cdn-upload-plugin';
const log = webpack_log_1.default({ name: PLUGIN_NAME, level: process.env.DEBUG ? 'debug' : 'warn' });
const escapeStringRegexp = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
function replaceFile(file, source, target) {
    return file.replace(new RegExp(escapeStringRegexp(source), 'g'), target);
}
class WebpackCdnUploadPlugin {
    constructor(options = {}) {
        const { upload, replaceAsyncChunkName = false, replaceUrlInCss = true, replaceAssetsInHtml = false } = options;
        if (!lodash_1.isFunction(upload)) {
            log.warn(`You have not provide an upload function. If you need to upload assets to cdn, please provide an upload function or you can remove ${PLUGIN_NAME}.`);
        }
        this.upload = upload;
        this.replaceAsyncChunkName = replaceAsyncChunkName;
        this.replaceUrlInCss = replaceUrlInCss;
        this.replaceAssetsInHtml = replaceAssetsInHtml;
        // generate a random id to mark the chunkname, so that we can replace it.
        this.uniqueMark = `${nanoid_1.nanoid()}-set-by-${PLUGIN_NAME}`;
        this.chunksIdUrlMap = {};
        this.chunksNameUrlMap = {};
    }
    apply(compiler) {
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
    }
    compilationFn(_, compilation) {
        compilation.hooks.processAssets.tapPromise({ name: PLUGIN_NAME, stage: webpack_1.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE }, async (assets) => {
            const sortedChunks = Array.from(compilation.chunks).sort((a) => {
                if (a.canBeInitial()) {
                    return 1;
                }
                return -1;
            });
            for (const chunk of sortedChunks) {
                for (const filename of chunk.files) {
                    if (!assets[filename]) {
                        continue;
                    }
                    const originalSource = assets[filename].source();
                    if (this.replaceUrlInCss && /.css$/.test(filename)) {
                        const matches = originalSource.matchAll(/url\((.*?)\)/g);
                        let replacedSource = originalSource;
                        for (const match of matches) {
                            const rawPath = match[1].replace(new RegExp(this.originPublicPath), '');
                            let uploadedUrl = this.chunksNameUrlMap[match[1]];
                            if (!uploadedUrl) {
                                const resourceData = compilation.assets[rawPath];
                                if (!resourceData) {
                                    continue;
                                }
                                uploadedUrl = await this.uploadFile(resourceData.source(), rawPath);
                            }
                            if (uploadedUrl && lodash_1.isString(uploadedUrl)) {
                                replacedSource = replaceFile(replacedSource, `(${match[1]}`, `(${uploadedUrl}`);
                            }
                        }
                        assets[filename].source = () => {
                            return replacedSource;
                        };
                        assets[filename].buffer = () => {
                            return Buffer.from(replacedSource);
                        };
                        continue;
                    }
                    if (chunk.canBeInitial()) {
                        const source = originalSource.replace(new RegExp(String.raw `"${this.uniqueMark}" ?\+ ?(\S+?) ?\+ ?"${this.uniqueMark}.*${this.uniqueMark}"`, 'g'), (_, $1) => {
                            return `(${JSON.stringify(this.chunksIdUrlMap)})[${$1}]`;
                        });
                        assets[filename].source = () => {
                            return source;
                        };
                        assets[filename].buffer = () => {
                            return Buffer.from(source);
                        };
                    }
                    await this.uploadFile(originalSource, this.restoreChunkName(filename), chunk);
                }
            }
            Object.keys(assets).forEach((filename) => {
                if (this.restoreChunkName(filename) !== filename) {
                    compilation.renameAsset(filename, this.restoreChunkName(filename));
                }
            });
        });
        if (this.replaceAssetsInHtml) {
            const { beforeEmit } = html_webpack_plugin_1.default.getHooks(compilation);
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
                    const nameWithPublicPathRegExp = new RegExp(`${escapeStringRegexp(this.originPublicPath)}((${this.uniqueMark})+.+${this.uniqueMark})?${escapeStringRegexp(rawFileName)}((${this.uniqueMark})+)?`);
                    const match = html.match(nameWithPublicPathRegExp);
                    if (match) {
                        const uploadedUrl = this.chunksNameUrlMap[nameWithPublicPath];
                        /* istanbul ignore if  */
                        if (uploadedUrl) {
                            html = replaceFile(html, `"${match[0]}`, `"${uploadedUrl}`);
                            continue;
                        }
                        const url = await this.uploadFile(html, rawFileName);
                        if (url && lodash_1.isString(url)) {
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
    markChunkName(compiler) {
        // if we need to replace async chunk name
        // we will set a mark on its parent chunk source
        const { chunkFilename: originChunkFilename, 
        // publicPath has not default value in webpack4
        publicPath: originPublicPath = '', } = compiler.options.output;
        this.originChunkFilename = originChunkFilename;
        this.originPublicPath = originPublicPath;
        compiler.options.output.chunkFilename = `${this.uniqueMark}[id]${this.uniqueMark}${originChunkFilename}${this.uniqueMark}`;
    }
    restoreChunkName(name) {
        return name
            .replace(new RegExp(`${this.uniqueMark}(.*?)${this.uniqueMark}`, 'g'), '')
            .replace(new RegExp(this.uniqueMark, 'g'), '');
    }
    async uploadChunk(chunk, compilation) {
        for (const filename of chunk.files) {
            const asset = compilation.getAsset(filename).source;
            let fileSource = asset.source();
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
                    if (!rawSource)
                        continue;
                    const source = rawSource.source();
                    const url = await this.uploadFile(source, rawPath);
                    if (url && lodash_1.isString(url)) {
                        fileSource = replaceFile(fileSource, `(${nameWithPublicPath}`, `(${url}`);
                        asset.source = () => fileSource;
                    }
                }
            }
            await this.uploadFile(fileSource, this.restoreChunkName(filename), chunk);
        }
    }
    async uploadFile(source, name, chunk) {
        const url = await this.upload(source, name, chunk);
        const nameWithPublicPath = (this.originPublicPath || '') + name;
        if (chunk) {
            this.chunksIdUrlMap[chunk.id] =
                url && lodash_1.isString(url) ? url : this.replaceAsyncChunkName ? nameWithPublicPath : name;
        }
        this.chunksNameUrlMap[nameWithPublicPath] = url || nameWithPublicPath;
        log.info(`"${name}" is uploaded and it will be as "${url || nameWithPublicPath}"`);
        return url;
    }
}
exports.default = WebpackCdnUploadPlugin;
//# sourceMappingURL=index.js.map