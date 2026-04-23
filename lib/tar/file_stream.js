'use strict';

const fs = require('fs');
const path = require('path');
const stream = require('stream');
const utils = require('../utils');
const { createTarBuffer } = require('./archive');

class TarFileStream extends stream.Transform {
  constructor(opts) {
    super(opts);
    this._opts = opts;
    this._chunks = [];

    const sourceType = utils.sourceType(opts.source);

    if (sourceType === 'file') {
      // stat file to get file size
      fs.stat(opts.source, (err, stat) => {
        if (err) return this.emit('error', err);
        const stream = fs.createReadStream(opts.source, opts.fs);
        utils.streamToBuffer(stream)
          .then(buffer => this._pushArchive({
            name: opts.relativePath || path.basename(opts.source),
            data: buffer,
            attrs: {
              mode: (stat.mode & 0o777).toString(8),
            },
          }))
          .catch(error => this.emit('error', error));
      });
    } else if (sourceType === 'buffer') {
      if (!opts.relativePath) return this.emit('error', 'opts.relativePath is required if opts.source is a buffer');
      this._pushArchive({
        name: opts.relativePath,
        data: opts.source,
      });
    } else { // stream or undefined
      if (!opts.relativePath) return process.nextTick(() => this.emit('error', 'opts.relativePath is required'));

      if (!opts.size) {
        if (!opts.suppressSizeWarning) {
          console.warn('You should specify the size of streamming data by opts.size to prevent all streaming data from loading into memory. If you are sure about memory cost, pass opts.suppressSizeWarning: true to suppress this warning');
        }
      }

      if (sourceType === 'stream') {
        opts.source.on('error', err => this.emit('error', err));
        opts.source.pipe(this);
      }
    }
  }

  _transform(chunk, encoding, callback) {
    this._chunks.push(Buffer.from(chunk));
    callback();
  }

  _flush(callback) {
    const sourceType = utils.sourceType(this._opts.source);
    if (sourceType === 'stream' || sourceType === undefined) {
      try {
        this.push(createTarBuffer([{
          name: this._opts.relativePath,
          data: Buffer.concat(this._chunks),
        }]));
        callback();
      } catch (err) {
        callback(err);
      }
      return;
    }

    callback();
  }

  _pushArchive(entry) {
    try {
      this.push(createTarBuffer([ entry ]));
      this.end();
    } catch (err) {
      this.emit('error', err);
    }
  }
}

module.exports = TarFileStream;
