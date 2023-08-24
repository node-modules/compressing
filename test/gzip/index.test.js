'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressing = require('../..');
const assert = require('assert');
const isWindows = os.platform() === 'win32';

describe('test/gzip/index.test.js', () => {
  describe('gzip.compressFile()', () => {
    it('gzip.compressFile(file, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.gzip.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('gzip.compressFile(file, destStream) should error if destStream emit error', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.gz');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));

      let err;
      try {
        await compressing.gzip.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xx');
    });

    it('gzip.compressFile(buffer, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceBuffer = fs.readFileSync(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.gzip.compressFile(sourceBuffer, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('gzip.compressFile(sourceStream, destStream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.gzip.compressFile(sourceStream, fileStream);
      assert(fs.existsSync(destFile));
    });
  });

  describe('gzip.uncompress()', () => {
    it('gzip.uncompress(sourceFile, destStream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log.gz');
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      const fileStream = fs.createWriteStream(destFile);
      await compressing.gzip.uncompress(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('gzip.uncompress(sourceStream, destStream)', async () => {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xx.log.gz'));
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      const fileStream = fs.createWriteStream(destFile);
      await compressing.gzip.uncompress(sourceStream, fileStream);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('gzip.uncompress(sourceStream, destFile)', async () => {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xx.log.gz'));
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      await compressing.gzip.uncompress(sourceStream, destFile);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('gzip.uncompress(sourceFile, destFile)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log.gz');
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      await compressing.gzip.uncompress(sourceFile, destFile);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('gzip.uncompress(buffer, destFile)', async () => {
      const sourceBuffer = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xx.log.gz'));
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      await compressing.gzip.uncompress(sourceBuffer, destFile);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });
  });
});
