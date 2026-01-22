'use strict';

const fs = require('fs');
const lzma = require('lzma-native');
const utils = require('../utils');
const streamifier = require('streamifier');

class XzFileStream extends lzma.Compressor {
  constructor(opts) {
    opts = opts || {};
    const lzmaOpts = {
      preset: opts.preset || 6,
      threads: opts.threads || 0,
    };
    super(lzmaOpts);

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

    // else undefined: do nothing
  }
}

module.exports = XzFileStream;
