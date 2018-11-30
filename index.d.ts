import {ReadStream, WriteStream} from 'fs'

type sourceType = string | Buffer | ReadStream;

type destType = string | WriteStream;

type streamEntryOpts = {
  relativePath?: string;
  ignoreBase?: boolean;
  size?: number;
}


export namespace gzip {

  function compressFile(source: sourceType, dest: destType, opts?: any): Promise<void>;

  function uncompress(source: sourceType, dest: destType, opts?: any): Promise<void>;

  export class FileStream {

    constructor(opts?: {
      zlib?: object,
      source: sourceType
    });

  }

  export class UncompressStream {

    constructor(opts?: {
      zlib?: object,
      source: sourceType
    });

    on(event: 'error', cb: Function)

  }

}

export namespace tar {

  function compressFile(source: sourceType, dest: destType, opts?: any): Promise<void>;

  function compressDir(source: sourceType, dest: destType, opts?: any): Promise<void>;

  function uncompress(source: sourceType, dest: string, opts?: any): Promise<void>;

  export class Stream {

    constructor();

    addEntry(entry: string, opts?: streamEntryOpts);

    addEntry(entry: Buffer | ReadStream, opts: streamEntryOpts);
  }

  export class FileStream {

    constructor(opts?: {
      relativePath?: string,
      size?: number,
      suppressSizeWarning?: boolean,
      source?: sourceType
    });

  }

  export class UncompressStream {

    constructor(opts?: {
      source: sourceType
    });


    on(event: 'error', cb: Function)

  }

}

export namespace tgz {

  function compressFile(source: sourceType, dest: destType, opts?: any): Promise<void>;

  function compressDir(source: sourceType, dest: destType, opts?: any): Promise<void>;

  function uncompress(source: sourceType, dest: string, opts?: any): Promise<void>;

  export class Stream {

    constructor();

    addEntry(entry: string, opts?: streamEntryOpts);

    addEntry(entry: Buffer | ReadStream, opts: streamEntryOpts);
  }

  export class FileStream {

    constructor(opts?: {
      relativePath?: string,
      size?: number,
      suppressSizeWarning?: boolean,
      zlib?: object,
      source?: sourceType
    });

  }

  export class UncompressStream {

    constructor(opts?: {
      source?: sourceType,
      strip?: number
    });

    on(event: 'entry' | 'finish' | 'error', cb: Function)

  }

}

export namespace zip {

  function compressFile(source: sourceType, dest: destType, opts?: any): Promise<void>;

  function compressDir(source: sourceType, dest: destType, opts?: any): Promise<void>;

  function uncompress(source: sourceType, dest: string, opts?: any): Promise<void>;

  export class Stream {

    constructor();

    addEntry(entry: string, opts?: streamEntryOpts);

    addEntry(entry: Buffer | ReadStream, opts: streamEntryOpts);
  }

  export class FileStream {

    /**
     *  If opts.source is a file path, opts.relativePath is optional, otherwise it's required.
     *
     *  @param opts
     */
    constructor(opts?: {
      relativePath?: string,
      yazl?: Object,
      source: string
    } | {
      relativePath: string,
      yazl?: Object,
      source?: Buffer | ReadStream
    });

  }

  export class UncompressStream {

    constructor(opts?: {
      source?: sourceType,
      strip?: number
    });

    on(event: 'entry' | 'finish' | 'error', cb: Function)

  }

}

