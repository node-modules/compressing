'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressible = require('../..');
const assert = require('power-assert');

describe('test/gzip/index.test.js', () => {
  describe('gzip.compressFile()', () => {
    it('gzip.compressFile(file, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressible.gzip.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('gzip.compressFile(file, destStream) should error if destStream emit error', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.gz');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));

      let err;
      try {
        yield compressible.gzip.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xx');
    });

    it('gzip.compressFile(buffer, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceBuffer = fs.readFileSync(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressible.gzip.compressFile(sourceBuffer, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('gzip.compressFile(sourceStream, destStream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressible.gzip.compressFile(sourceStream, fileStream);
      assert(fs.existsSync(destFile));
    });
  });
});
