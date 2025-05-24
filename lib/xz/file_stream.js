'use strict';

const fs = require('fs');
const lzma = require('lzma-native');
const utils = require('../utils');
const streamifier = require('streamifier');
const stream = require('stream');

class XzFileStream extends stream.Transform {
  constructor(opts) {
    opts = opts || {};
    super(opts);

    const sourceType = utils.sourceType(opts.source);
    const compressor = lzma.createCompressor(opts.lzma);

    compressor.on('error', err => this.emit('error', err));
    compressor.on('end', () => this.push(null));
    compressor.on('data', chunk => this.push(chunk));

    if (sourceType === 'file') {
      const stream = fs.createReadStream(opts.source, opts.fs);
      stream.on('error', err => this.emit('error', err));
      stream.pipe(compressor);
      return;
    }

    if (sourceType === 'buffer') {
      const stream = streamifier.createReadStream(opts.source, opts.streamifier);
      stream.on('error', err => this.emit('error', err));
      stream.pipe(compressor);
      return;
    }

    if (sourceType === 'stream') {
      opts.source.on('error', err => this.emit('error', err));
      opts.source.pipe(compressor);
      return;
    }

    // For streaming input
    this.on('pipe', srcStream => {
      srcStream.unpipe(srcStream);
      srcStream.pipe(compressor);
    });
  }

  _transform(chunk, encoding, callback) {
    // This will be handled by the compressor stream
    callback();
  }
}

module.exports = XzFileStream;
