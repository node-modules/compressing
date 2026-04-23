'use strict';

const fs = require('fs');
const path = require('path');
const utils = require('../utils');
const BaseStream = require('../base_stream');
const { createTarBuffer } = require('./archive');

class TarStream extends BaseStream {
  constructor(opts) {
    super(opts);

    this._archiveEntries = [];
    this._waitingEntries = [];
    this._processing = false;
    this._init(opts);
  }

  _init() {}

  addEntry(entry, opts) {
    if (this._processing) {
      return this._waitingEntries.push([ entry, opts ]);
    }

    opts = opts || {};
    this._processing = true;

    const entryType = utils.entryType(entry);
    if (!entryType) return; // TODO

    if (entryType === 'fileOrDir') {
      this._addFileOrDirEntry(entry, opts);
    } else if (entryType === 'buffer') {
      this._addBufferEntry(entry, opts);
    } else { // stream
      this._addStreamEntry(entry, opts);
    }

  }

  _addFileOrDirEntry(entry, opts) {
    fs.stat(entry, (err, stat) => {
      if (err) return this.emit('error', err);
      if (stat.isDirectory()) return this._addDirEntry(entry, opts);
      if (stat.isFile()) return this._addFileEntry(entry, opts);

      const illigalEntryError = new Error('Type is not supported, must be a file path, directory path, file buffer, or a readable stream');
      illigalEntryError.name = 'IlligalEntryError';
      this.emit('error', illigalEntryError);
    });
  }

  _addFileEntry(entry, opts) {
    // stat file to get file size
    fs.stat(entry, (err, stat) => {
      if (err) return this.emit('error', err);
      const stream = fs.createReadStream(entry, opts.fs);
      utils.streamToBuffer(stream)
        .then(buffer => {
          this._archiveEntries.push({
            name: opts.relativePath || path.basename(entry),
            data: buffer,
            attrs: {
              mode: (stat.mode & 0o777).toString(8),
            },
          });
          this._onEntryFinish();
        })
        .catch(error => this.emit('error', error));
    });
  }

  _addDirEntry(entry, opts) {
    fs.readdir(entry, (err, files) => {
      if (err) return this.emit('error', err);

      const relativePath = opts.relativePath || '';
      files.forEach(fileOrDir => {
        const newOpts = utils.clone(opts);
        if (opts.ignoreBase) {
          newOpts.relativePath = path.posix.join(relativePath, fileOrDir);
        } else {
          newOpts.relativePath = path.posix.join(relativePath, path.basename(entry), fileOrDir);
        }
        newOpts.ignoreBase = true;
        this.addEntry(path.posix.join(entry, fileOrDir), newOpts);
      });
      this._onEntryFinish();
    });
  }

  _addBufferEntry(entry, opts) {
    if (!opts.relativePath) return this.emit('error', 'opts.relativePath is required if entry is a buffer');
    this._archiveEntries.push({
      name: opts.relativePath,
      data: entry,
    });
    this._onEntryFinish();
  }

  _addStreamEntry(entry, opts) {
    entry.on('error', err => this.emit('error', err));

    if (!opts.relativePath) return this.emit('error', new Error('opts.relativePath is required'));

    if (opts.size) {
      utils.streamToBuffer(entry)
        .then(buffer => {
          this._archiveEntries.push({
            name: opts.relativePath,
            data: buffer,
          });
          this._onEntryFinish();
        })
        .catch(error => this.emit('error', error));
    } else {
      if (!opts.suppressSizeWarning) {
        console.warn('You should specify the size of streaming data by opts.size to prevent all streaming data from loading into memory. If you are sure about memory cost, pass opts.suppressSizeWarning: true to suppress this warning');
      }
      utils.streamToBuffer(entry)
        .then(buffer => {
          this._archiveEntries.push({
            name: opts.relativePath,
            data: buffer,
          });
          this._onEntryFinish();
        })
        .catch(error => this.emit('error', error));
    }
  }

  _read() {}

  _onEntryFinish(err) {
    if (err) return this.emit('error', err);

    this._processing = false;
    const waitingEntry = this._waitingEntries.shift();
    if (waitingEntry) {
      this.addEntry.apply(this, waitingEntry);
    } else {
      this._finalize();
    }
  }

  _finalize() {
    try {
      this.push(createTarBuffer(this._archiveEntries));
      this.push(null);
    } catch (err) {
      this.emit('error', err);
    }
  }
}

module.exports = TarStream;
