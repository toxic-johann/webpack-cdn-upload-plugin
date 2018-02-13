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
const nanoid = require("nanoid");
const MATCH_PREG = /script\.src\s*\=\s*(__webpack_require__\.p\s*\+[^;]+)?;/;
class WebpackCdnUploadPlugin {
    constructor(options = {}) {
        const { rename, upload, replaceAsyncChunkName = false, } = options;
        this.rename = rename;
        this.upload = upload;
        this.replaceAsyncChunkName = replaceAsyncChunkName;
        // generate a random id to mark the chunkname, so that we can replace it.
        this.replaceMark = nanoid();
        this.chunksUrlMap = {};
    }
    apply(compiler) {
        compiler.plugin('this-compilation', compilation => {
            if (this.replaceAsyncChunkName) {
                this.markChunkName(compilation);
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
        this.originChunkFileName = compilation.outputOptions.chunkFilename;
        const chunkFileName = `${this.replaceMark}[id]${this.replaceMark}`;
        Object.defineProperty(compilation.outputOptions, 'chunkFilename', {
            get() {
                return chunkFileName;
            },
            set() {
                console.warn(`chunkFileName is set as ${chunkFileName} by webpack-upload-cdn-plugin, you can't change it`);
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
                    console.warn(chunk.id);
                    sortedChunks.splice(i, 1);
                }
            }
            console.warn(chunks.map(({ id, name, parents, chunks }) => ({ id, name, parents, chunks })));
        });
    }
    // if a file has async chunk
    // we need to change its async chunk name before upload
    replaceAsyncChunkMapOfChunk(chunk, compilation) {
        const asyncChunkMap = chunk.chunks.reduce((map, { id }) => {
            if (!this.chunksUrlMap[id]) {
                throw new Error(`We can't find the upload url of chunk ${id}. Please make sure it's uploaded before uploading it's parent chunk`);
            }
            map[id] = this.chunksUrlMap[id];
            return map;
        }, {});
        const filename = chunk.files[0];
        const chunkFile = compilation.assets[filename];
        const source = chunkFile.source()
            .replace(new RegExp(`"${this.replaceMark}"(.*?)"${this.replaceMark}"`), (text, match) => {
            const chunkIdVariable = match.replace(/\s\+/g, '');
            const newText = `${JSON.stringify(asyncChunkMap)}[${chunkIdVariable}]`;
            console.warn(this.replaceMark, chunkIdVariable, newText);
            return newText;
        });
        chunkFile.source = () => {
            return source;
        };
    }
    uploadChunk(chunk, compilation) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const filename of chunk.files) {
                const chunkSource = compilation.assets[filename].source();
                const url = yield this.upload(chunkSource, filename);
                if (url && toxic_predicate_functions_1.isString(url)) {
                    this.chunksUrlMap[chunk.id] = url;
                }
            }
        });
    }
}
module.exports = WebpackCdnUploadPlugin;
//# sourceMappingURL=index.js.map