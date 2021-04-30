import { Compiler, Compilation, Chunk } from 'webpack';
interface Options {
    upload?: (content: string, name: string, chunk: Chunk) => Promise<string>;
    replaceAsyncChunkName?: boolean;
    replaceUrlInCss?: boolean;
    replaceAssetsInHtml?: boolean;
}
declare class WebpackCdnUploadPlugin {
    upload: (content: string, name: string, chunk: Chunk) => Promise<string>;
    replaceAsyncChunkName: boolean;
    replaceUrlInCss: boolean;
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
    markChunkName(compiler: Compiler): void;
    restoreChunkName(name: string): string;
    uploadFile(source: string, name: string, chunk?: Chunk): Promise<string>;
}
export default WebpackCdnUploadPlugin;
