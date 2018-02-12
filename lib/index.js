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
const toxic_predicate_functions_1 = require("toxic-predicate-functions");
let instanceCounter = 0;
const MATCH_PREG = /script\.src\s*\=\s*(__webpack_require__\.p\s*\+[^;]+)?;/;
console.log('!!!!');
class WebpackCdnUploadPlugin {
    constructor(options = {}) {
        const { rename, upload, replaceAsyncChunkName = false, } = options;
        this.rename = rename;
        this.upload = upload;
        this.replaceAsyncChunkName = replaceAsyncChunkName;
        this.instanceId = instanceCounter++;
    }
    replaceAsyncChunkNameByRegExp(compilation, chunksMap) {
        const parents = compilation.chunks.filter(stat => stat.parents.length === 0);
        chunksMap = JSON.stringify(chunksMap);
        parents.forEach(parent => {
            const source = compilation.assets[parent.files[0]].source().replace(MATCH_PREG, (text, match) => text.replace(match, chunksMap + '[chunkId]'));
            compilation.assets[parent.files[0]].source = () => source;
        });
    }
    uploadAsset(compilation, callback) {
        const { chunks } = compilation;
        const chunksMap = {};
        const uploadPromise = chunks.map((chunkStat) => __awaiter(this, void 0, void 0, function* () {
            for (const filename of chunkStat.files) {
                const chunkSource = compilation.assets[filename].source();
                const url = yield this.upload(chunkSource, filename);
                if (url && toxic_predicate_functions_1.isString(url)) {
                    chunksMap[chunkStat.id] = url;
                }
            }
        }));
        Promise.all(uploadPromise).then(() => {
            if (this.replaceAsyncChunkName) {
                this.replaceAsyncChunkNameByRegExp(compilation, chunksMap);
            }
            callback();
        });
    }
    apply(compiler) {
        compiler.plugin('emit', (compilation, callback) => {
            if (toxic_predicate_functions_1.isFunction(this.upload))
                this.uploadAsset(compilation, callback);
            else
                callback();
        });
        compiler.plugin('this-compilation', compilation => {
            console.warn(Object.keys(compilation));
            compilation.outputOptions.chunkFilename = '[name].js';
            console.warn(compilation.outputOptions.chunkFilename);
            compilation.plugin(['optimize-chunks', 'optimize-extracted-chunks'], chunks => {
                // Prevent multiple rename operations
                if (compilation[this.instanceId]) {
                    return;
                }
                compilation[this.instanceId] = true;
                chunks.forEach(chunk => {
                    if (toxic_predicate_functions_1.isFunction(this.rename)) {
                        const newName = this.rename(chunk);
                        console.warn(newName, chunk);
                        if (newName && toxic_predicate_functions_1.isString(newName)) {
                            chunk.filenameTemplate = newName;
                            chunk.name = newName;
                        }
                    }
                    else if (toxic_predicate_functions_1.isString(this.rename)) {
                        chunk.filenameTemplate = this.rename;
                    }
                });
            });
        });
    }
}
module.exports = WebpackCdnUploadPlugin;
//# sourceMappingURL=index.js.map