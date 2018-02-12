import { isString, isFunction } from 'toxic-predicate-functions';
let instanceCounter = 0;
const MATCH_PREG = /script\.src\s*\=\s*(__webpack_require__\.p\s*\+[^;]+)?;/;

interface Options {
  rename?: Function | string;
  upload?: Function;
  replaceAsyncChunkName?: boolean;
}

class WebpackCdnUploadPlugin {
  rename: Function | undefined | string;
  upload: Function;
  replaceAsyncChunkName: boolean;
  instanceId: number;


  constructor(options: Options = {}) {
    const {
      rename,
      upload,
      replaceAsyncChunkName = false,
    } = options;
    this.rename = rename;
    this.upload = upload;
    this.replaceAsyncChunkName = replaceAsyncChunkName;
    this.instanceId = instanceCounter++;
  }

  replaceAsyncChunkNameByRegExp(compilation, chunksMap) {
    const parents = compilation.chunks.filter(stat => stat.parents.length === 0);
    chunksMap = JSON.stringify(chunksMap);
    parents.forEach(parent => {
      const source = compilation.assets[parent.files[0]].source().replace(MATCH_PREG, (text, match) =>
        text.replace(match, chunksMap + '[chunkId]')
      );
      compilation.assets[parent.files[0]].source = () => source;
    });
  }

  uploadAsset(compilation, callback) {
    const { chunks } = compilation;
    const chunksMap = {};
    const uploadPromise = chunks.map(async chunkStat => {
      for (const filename of chunkStat.files) {
        const chunkSource = compilation.assets[filename].source();

        const url = await this.upload(chunkSource, filename);
        if (url && isString(url)) {
          chunksMap[chunkStat.id] = url;
        }
      }
    });

    Promise.all(uploadPromise).then(() => {
      if (this.replaceAsyncChunkName) {
        this.replaceAsyncChunkNameByRegExp(compilation, chunksMap);
      }
      callback();
    });
  }

  apply(compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      if (isFunction(this.upload)) this.uploadAsset(compilation, callback);
      else callback();
    });
    compiler.plugin('this-compilation', compilation => {
      console.warn(Object.keys(compilation));
      compilation.outputOptions.chunkFilename = '[name].js';
      console.warn(compilation.outputOptions.chunkFilename);
      compilation.plugin([ 'optimize-chunks', 'optimize-extracted-chunks' ], chunks => {
        // Prevent multiple rename operations
        if (compilation[this.instanceId]) {
          return;
        }
        compilation[this.instanceId] = true;
        chunks.forEach(chunk => {
          if (isFunction(this.rename)) {
            const newName = this.rename(chunk);
            console.warn(newName, chunk);
            if (newName && isString(newName)) {
              chunk.filenameTemplate = newName;
              chunk.name = newName;
            }
          } else if (isString(this.rename)) {
            chunk.filenameTemplate = this.rename;
          }
        });
      });
    });
  }
}

module.exports = WebpackCdnUploadPlugin;
