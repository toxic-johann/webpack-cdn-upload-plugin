"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
/* eslint-disable no-loop-func, no-await-in-loop, no-continue, no-param-reassign, no-restricted-syntax, no-shadow, max-len, no-plusplus, no-nested-ternary, func-names  */
const lodash_1 = require("lodash");
const nanoid_1 = require("nanoid");
const webpack_1 = require("webpack");
const webpack_log_1 = __importDefault(require("webpack-log"));
const PLUGIN_NAME = 'webpack-cdn-upload-plugin';
const log = webpack_log_1.default({ name: PLUGIN_NAME, level: process.env.DEBUG ? 'debug' : 'warn' });
const escapeStringRegexp = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
class WebpackCdnUploadPlugin {
    constructor(options = {}) {
        const { upload } = options;
        if (!lodash_1.isFunction(upload)) {
            log.warn(`You have not provide an upload function. If you need to upload assets to cdn, please provide an upload function or you can remove ${PLUGIN_NAME}.`);
        }
        this.upload = upload;
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
            this.originPublicPath = '';
            if (compiler.options.output.publicPath && compiler.options.output.publicPath !== 'auto') {
                this.originPublicPath = compiler.options.output.publicPath;
            }
            compiler.options.output.publicPath = '';
            compiler.options.output.filename = `${this.uniqueMark}[id]${this.uniqueMark}${compiler.options.output.filename}${this.uniqueMark}.js`;
            compiler.options.output.chunkFilename = `${this.uniqueMark}[id]${this.uniqueMark}${compiler.options.output.chunkFilename}${this.uniqueMark}.js`;
        });
        compiler.hooks.compilation.tap(PLUGIN_NAME, (...args) => {
            this.compilationFn.call(this, compiler, ...args);
        });
    }
    compilationFn(_, compilation) {
        compilation.hooks.buildModule.tap(PLUGIN_NAME, (module) => {
            // console.log(module);
        });
        compilation.hooks.processAssets.tapPromise({ name: PLUGIN_NAME, stage: webpack_1.Compilation.PROCESS_ASSETS_STAGE_REPORT }, async (assets) => {
            const traverseUpload = async (chunkGroup) => {
                for (const childGroup of chunkGroup.childrenIterable) {
                    await traverseUpload(childGroup);
                }
                for (const chunk of chunkGroup.chunks) {
                    for (const filename of chunk.auxiliaryFiles) {
                        if (this.chunksNameUrlMap[filename] || !assets[filename]) {
                            continue;
                        }
                        await this.uploadFile(assets[filename].source(), filename);
                    }
                    for (const filename of chunk.files) {
                        if (this.chunksNameUrlMap[filename] || !assets[filename]) {
                            continue;
                        }
                        let replacedSource = assets[filename].source();
                        for (const uploadedFile of Object.keys(this.chunksNameUrlMap).filter((i) => !i.endsWith('.js'))) {
                            replacedSource = replacedSource.replace(new RegExp(escapeStringRegexp(uploadedFile), 'g'), this.chunksNameUrlMap[uploadedFile]);
                        }
                        if (chunkGroup.isInitial()) {
                            replacedSource = replacedSource.replace(new RegExp(String.raw `"${this.uniqueMark}" ?\+ ?(\S+?) ?\+ ?"${this.uniqueMark}".*?${this.uniqueMark}\.[A-Za-z]+"`, 'g'), (_, $1) => `(${JSON.stringify(this.chunksIdUrlMap)})[${$1}]`);
                        }
                        assets[filename].source = () => replacedSource;
                        assets[filename].buffer = () => Buffer.from(replacedSource);
                        await this.uploadFile(replacedSource, filename, filename.endsWith('.js') && chunk);
                    }
                }
            };
            for (const chunkGroup of compilation.chunkGroups) {
                if (chunkGroup.isInitial()) {
                    await traverseUpload(chunkGroup);
                }
            }
            const htmlFilenames = Object.keys(assets).filter((i) => /\.html$/.test(i));
            for (const htmlFilename of htmlFilenames) {
                let replacedSource = assets[htmlFilename].source();
                for (const uploadedFile of Object.keys(this.chunksNameUrlMap)) {
                    replacedSource = replacedSource.replace(new RegExp(escapeStringRegexp(uploadedFile), 'g'), this.chunksNameUrlMap[uploadedFile]);
                }
                assets[htmlFilename].source = () => replacedSource;
                assets[htmlFilename].buffer = () => Buffer.from(replacedSource);
            }
            Object.keys(assets).forEach((filename) => {
                if (this.restoreChunkName(filename) !== filename) {
                    compilation.renameAsset(filename, this.restoreChunkName(filename));
                }
            });
        });
    }
    restoreChunkName(name) {
        return name.replace(new RegExp(String.raw `${this.uniqueMark}.*?${this.uniqueMark}(.*?)${this.uniqueMark}\.[A-Za-z]+`, 'g'), (_, $1) => $1);
    }
    async uploadFile(source, name, chunk) {
        const url = this.upload ? await this.upload(source, this.restoreChunkName(name), chunk) : '';
        const nameWithPublicPath = (this.originPublicPath || '') + this.restoreChunkName(name);
        if (chunk) {
            this.chunksIdUrlMap[chunk.id] = url && lodash_1.isString(url) ? url : nameWithPublicPath;
        }
        this.chunksNameUrlMap[name] = url || nameWithPublicPath;
        log.info(`"${this.restoreChunkName(name)}" is uploaded and it will be as "${url || nameWithPublicPath}"`);
        return url;
    }
}
module.exports = WebpackCdnUploadPlugin;
//# sourceMappingURL=index.js.map