/// <reference types="node" />
import { Compiler, Compilation, Chunk } from 'webpack';
interface Options {
    upload?: (content: string | Buffer, name: string, chunk: Chunk) => Promise<string>;
}
declare class WebpackCdnUploadPlugin {
    upload: (content: string | Buffer, name: string, chunk: Chunk) => Promise<string>;
    replaceAssetsInHtml: boolean;
    uniqueMark: string;
    chunksIdUrlMap: {
        [key: string]: string;
    };
    chunksNameUrlMap: {
        [key: string]: string;
    };
    originChunkFilename: string;
    originPublicPath: string;
    entryNames: string[];
    constructor(options?: Options);
    apply(compiler: Compiler): void;
    compilationFn(_: Compiler, compilation: Compilation): void;
    restoreChunkName(name: string): string;
    uploadFile(source: string | Buffer, name: string, chunk?: Chunk): Promise<string>;
}
export = WebpackCdnUploadPlugin;
