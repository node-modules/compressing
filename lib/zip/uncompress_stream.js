'use strict';

// https://github.com/thejoshwolfe/yauzl#no-streaming-unzip-api

const yauzl = require('yauzl');
const stream = require('stream');
const utils = require('../utils');
const YAUZL_CALLBACK = Symbol('ZipUncompressStream#yauzlCallback');
const STRIP_NAME = Symbol('ZipUncompressStream#stripName');

const DEFAULTS = { lazyEntries: true };

class ZipUncompressStream extends stream.Writable {
  constructor(opts) {
    opts = opts || {};
    super(opts);

    this._chunks = [];
    this._strip = Number(opts.strip) || 0;

    this[YAUZL_CALLBACK] = this[YAUZL_CALLBACK].bind(this);

    const sourceType = utils.sourceType(opts.source);

    const yauzlOpts = this._yauzlOpts = Object.assign({}, DEFAULTS, opts.yauzl);
    if (sourceType === 'file') {
      yauzl.open(opts.source, yauzlOpts, this[YAUZL_CALLBACK]);
      return;
    }

    if (sourceType === 'buffer') {
      yauzl.fromBuffer(opts.source, yauzlOpts, this[YAUZL_CALLBACK]);
      return;
    }

    if (sourceType === 'stream') {
      utils.streamToBuffer(opts.source)
      .then(buf => yauzl.fromBuffer(buf, yauzlOpts, this[YAUZL_CALLBACK]))
      .catch(e => this.emit('error', e));
      return;
    }

    this.on('pipe', srcStream => {
      srcStream.unpipe(srcStream);

      utils.streamToBuffer(srcStream)
      .then(buf => {
        this._chunks.push(buf);
        buf = Buffer.concat(this._chunks);
        yauzl.fromBuffer(buf, yauzlOpts, this[YAUZL_CALLBACK]);
      })
      .catch(e => this.emit('error', e));
    });
  }

  _write(chunk) {
    // push to _chunks array, this will only happen once, for stream will be unpiped.
    this._chunks.push(chunk);
  }

  [YAUZL_CALLBACK](err, zipFile) {
    if (err) return this.emit('error', err);

    zipFile.readEntry();

    zipFile
    .on('entry', entry => {
      const name = entry.fileName = this[STRIP_NAME](entry.fileName);

      // directory file names end with '/'
      const type = /\/$/.test(name) ? 'directory' : 'file';
      const header = { name, type, yauzl: entry };

      if (type === 'file') {
        zipFile.openReadStream(entry, (err, readStream) => {
          if (err) return this.emit('error', err);
          this.emit('entry', header, readStream, next);
        });
      } else { // directory
        const placeholder = new stream.Readable({ read() {} });
        this.emit('entry', header, placeholder, next);
        setImmediate(() => placeholder.emit('end'));
      }
    })
    .on('end', () => this.emit('finish'))
    .on('error', err => this.emit('error', err));

    function next() {
      zipFile.readEntry();
    }
  }

  [STRIP_NAME](fileName) {
    // before
    // node/package.json
    // node/lib/index.js
    //
    // when strip 1
    // package.json
    // lib/index.js
    //
    // when strip 2
    // package.json
    // index.js
    const s = fileName.split('/');
    const strip = Math.min(this._strip, s.length - 1);
    return s.slice(strip).join('/') || '/';
  }
}

module.exports = ZipUncompressStream;
