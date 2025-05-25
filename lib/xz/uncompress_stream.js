'use strict';

const fs = require('fs');
const lzma = require('lzma-native');
const utils = require('../utils');
const streamifier = require('streamifier');
const { PassThrough } = require('stream');

class XzUncompressStream extends PassThrough {
  constructor(opts) {
    opts = opts || {};
    super(opts);

    const sourceType = utils.sourceType(opts.source);
    const decompressor = lzma.createDecompressor(opts.lzma);

    decompressor.on('error', err => this.emit('error', err));
    decompressor.on('end', () => this.end());

    // Handle single file decompression
    if (sourceType === 'file') {
      const stream = fs.createReadStream(opts.source, opts.fs);
      stream.on('error', err => this.emit('error', err));
      stream.pipe(decompressor).pipe(this);
      return;
    }

    if (sourceType === 'buffer') {
      const stream = streamifier.createReadStream(opts.source, opts.streamifier);
      stream.on('error', err => this.emit('error', err));
      stream.pipe(decompressor).pipe(this);
      return;
    }

    if (sourceType === 'stream') {
      opts.source.on('error', err => this.emit('error', err));
      opts.source.pipe(decompressor).pipe(this);
      return;
    }

    // For streaming input
    this.on('pipe', srcStream => {
      srcStream.unpipe(this);
      srcStream.pipe(decompressor).pipe(this);
    });
  }
}
}

module.exports = XzUncompressStream;
