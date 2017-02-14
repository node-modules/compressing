'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressing = require('../..');
const assert = require('power-assert');

describe('test/gzip/index.test.js', () => {
  describe('gzip.compressFile()', () => {
    it('gzip.compressFile(file, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.gzip.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('gzip.compressFile(file, destStream) should error if destStream emit error', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.gz');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));

      let err;
      try {
        yield compressing.gzip.compressFile(sourceFile, fileStream);
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
      yield compressing.gzip.compressFile(sourceBuffer, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('gzip.compressFile(sourceStream, destStream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.gzip.compressFile(sourceStream, fileStream);
      assert(fs.existsSync(destFile));
    });
  });

  describe('gzip.uncompress()', () => {
    it('gzip.uncompress(sourceFile, destStream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log.gz');
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.gzip.uncompress(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
    });

    it('gzip.uncompress(sourceStream, destStream)', function* () {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xx.log.gz'));
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.gzip.uncompress(sourceStream, fileStream);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
    });

    it('gzip.uncompress(sourceStream, destFile)', function* () {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xx.log.gz'));
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      yield compressing.gzip.uncompress(sourceStream, destFile);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
    });

    it('gzip.uncompress(sourceFile, destFile)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log.gz');
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      yield compressing.gzip.uncompress(sourceFile, destFile);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
    });

    it('gzip.uncompress(buffer, destFile)', function* () {
      const sourceBuffer = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xx.log.gz'));
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      yield compressing.gzip.uncompress(sourceBuffer, destFile);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
    });
  });
});
