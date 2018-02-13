import { isString, isFunction } from 'toxic-predicate-functions';
import * as nanoid from 'nanoid';

interface Options {
  rename?: Function | string;
  upload?: Function;
  replaceAsyncChunkName?: boolean;
}

class WebpackCdnUploadPlugin {
  rename: Function | undefined | string;
  upload: Function;
  replaceAsyncChunkName: boolean;
  uniqueMark: string;
  chunksUrlMap: { [key: string]: string };
  originChunkFilename: string;
  originPublicPath: string;

  constructor(options: Options = {}) {
    const {
      rename,
      upload,
      replaceAsyncChunkName = false,
    } = options;
    this.rename = rename;
    this.upload = upload;
    this.replaceAsyncChunkName = replaceAsyncChunkName;
    // generate a random id to mark the chunkname, so that we can replace it.
    this.uniqueMark = nanoid();
    this.chunksUrlMap = {};
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
      }
    });

    compiler.plugin('emit', async (compilation, callback) => {
      if (isFunction(this.upload)) {
        await this.uploadAssets(compilation);
        callback();
      } else callback();
    });
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

  async uploadAssets(compilation) {
    const { chunks } = compilation;
    // sort chunks so that we can upload the async chunk at first
    const sortedChunks = chunks.map(a => a)
      .sort((a, b) => b.chunks.length - a.chunks.length);
    while (sortedChunks.length) {
      for (let i = sortedChunks.length - 1; i > -1;i--) {
        const chunk = sortedChunks[i];

        // only upload when its childChunk is uploaed
        const uploadAble = chunk.chunks.reduce((uploadAble, childChunk) => uploadAble && sortedChunks.indexOf(childChunk) === -1, true);
        if (!uploadAble) continue;

        if (this.replaceAsyncChunkName) {
          this.replaceAsyncChunkMapOfChunk(chunk, compilation);
        }

        await this.uploadChunk(chunk, compilation);
        sortedChunks.splice(i, 1);
      }
    }
  }

  // if a file has async chunk
  // we need to change its async chunk name before upload
  replaceAsyncChunkMapOfChunk(chunk, compilation) {
    const asyncChunkMap = chunk.chunks.reduce((map, { id }) => {
      /* istanbul ignore if */
      if (!this.chunksUrlMap[id]) {
        throw new Error(`We can't find the upload url of chunk ${id}. Please make sure it's uploaded before uploading it's parent chunk`);
      }
      map[id] = this.chunksUrlMap[id];
      return map;
    }, {});
    const filename = chunk.files[0];
    const chunkFile = compilation.assets[filename];
    const source = chunkFile.source()
      .replace(new RegExp(`src\\s?=(.*?)"${this.uniqueMark}(.*)${this.uniqueMark}"`), (text, $1, $2) => {
        const [ chunkIdStr ] = $2.split(this.uniqueMark);
        const chunkIdVariable = chunkIdStr.replace(/\s|\+|"/g, '');
        const newText = `src=${JSON.stringify(asyncChunkMap)}[${chunkIdVariable}]`;
        return newText;
      });
    chunkFile.source = () => {
      return source;
    };
  }

  async uploadChunk(chunk, compilation) {
    for (const filename of chunk.files) {
      const fileSource = compilation.assets[filename].source();
      const url = await this.upload(fileSource, filename, chunk);
      this.chunksUrlMap[chunk.id] = url && isString(url)
        ? url
        : this.replaceAsyncChunkName
          ? ((this.originPublicPath || '') + filename)
          : filename;
    }
  }
}

module.exports = WebpackCdnUploadPlugin;
