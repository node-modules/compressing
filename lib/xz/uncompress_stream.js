'use strict';

const fs = require('fs');
const lzma = require('lzma-native');
const utils = require('../utils');
const streamifier = require('streamifier');

class XzUncompressStream extends lzma.Decompressor {
  constructor(opts) {
    opts = opts || {};
    super(opts.lzma);

    const sourceType = utils.sourceType(opts.source);

    if (sourceType === 'file') {
      const stream = fs.createReadStream(opts.source, opts.fs);
      stream.on('error', err => this.emit('error', err));
      stream.pipe(this);
      return;
    }

    if (sourceType === 'buffer') {
      const stream = streamifier.createReadStream(opts.source, opts.streamifier);
      stream.on('error', err => this.emit('error', err));
      stream.pipe(this);
      return;
    }

    if (sourceType === 'stream') {
      opts.source.on('error', err => this.emit('error', err));
      opts.source.pipe(this);
    }

    // else: waiting to be piped
  }
}

module.exports = XzUncompressStream;
