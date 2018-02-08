const { isString, isFunction } = require('toxic-predicate-functions');
let instanceCounter = 0;
const MATCH_PREG = /script\.src\s*\=\s*(__webpack_require__\.p\s*\+[^;]+)?;/;

class Plugin {

  constructor(options = {}) {
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
    });
    compiler.plugin('this-compilation', compilation => {
      compilation.plugin([ 'optimize-chunks', 'optimize-extracted-chunks' ], chunks => {
        // Prevent multiple rename operations
        if (compilation[this.instanceId]) {
          return;
        }
        compilation[this.instanceId] = true;
        chunks.forEach(chunk => {
          if (isFunction(this.rename)) {
            chunk.filenameTemplate = this.rename(chunk.name);
          } else if (isString(this.rename)) {
            chunk.filenameTemplate = this.rename;
          }
        });
      });
    });
  }
}

module.exports = Plugin;
