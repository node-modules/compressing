'use strict';

const stream = require('stream');

class BaseStream extends stream.Readable {
  addEntry(/* entry, opts */) {
    throw new Error('.addEntry not implemented in sub class!');
  }

  _read() {}
}

module.exports = BaseStream;

