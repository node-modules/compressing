'use strict';

const fs = require('fs');
const stream = require('stream');
const utils = require('../utils');
const streamifier = require('streamifier');
const { parseTarBuffer } = require('./archive');

class TarUncompressStream extends stream.Writable {
  constructor(opts) {
    opts = opts || {};
    super(opts);
    this._chunks = [];

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

  _write(chunk, encoding, callback) {
    this._chunks.push(Buffer.from(chunk));
    callback();
  }

  _final(callback) {
    let entries;
    try {
      entries = parseTarBuffer(Buffer.concat(this._chunks));
    } catch (err) {
      callback(err);
      return;
    }

    let index = 0;
    const nextEntry = err => {
      if (err) {
        callback(err);
        return;
      }

      if (index >= entries.length) {
        callback();
        return;
      }

      const entry = entries[index++];
      const entryStream = stream.Readable.from(entry.data.length ? [ entry.data ] : []);
      let finished = false;
      const next = nextError => {
        if (finished) return;
        finished = true;
        nextEntry(nextError);
      };

      if (this.listenerCount('entry') === 0) {
        entryStream.resume();
        entryStream.on('end', next);
        return;
      }

      this.emit('entry', entry.header, entryStream, next);
    };

    nextEntry();
  }
}

module.exports = TarUncompressStream;
