'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressing = require('../..');
const assert = require('assert');
const isWindows = os.platform() === 'win32';

describe('test/xz/index.test.js', () => {
  describe('xz.compressFile()', () => {
    it('xz.compressFile(file, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
      // console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.xz.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('xz.compressFile(file, destStream) should error if destStream emit error', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.xz');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));

      let err;
      try {
        await compressing.xz.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xx');
    });

    it('xz.compressFile(buffer, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceBuffer = fs.readFileSync(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
      // console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.xz.compressFile(sourceBuffer, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('xz.compressFile(sourceStream, destStream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
      // console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.xz.compressFile(sourceStream, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('xz.compressFile(file, stream) with custom level', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
      const fileStream = fs.createWriteStream(destFile);
      await compressing.xz.compressFile(sourceFile, fileStream, { level: 9 });
      assert(fs.existsSync(destFile));
    });
  });

  describe('xz.uncompress()', () => {
    let compressedFile;

    before(async () => {
      // Create a compressed file for testing
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      compressedFile = path.join(os.tmpdir(), 'test-xx.log.xz');
      const fileStream = fs.createWriteStream(compressedFile);
      await compressing.xz.compressFile(sourceFile, fileStream);
    });

    it('xz.uncompress(sourceFile, destStream)', async () => {
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      const fileStream = fs.createWriteStream(destFile);
      await compressing.xz.uncompress(compressedFile, fileStream);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('xz.uncompress(sourceStream, destStream)', async () => {
      const sourceStream = fs.createReadStream(compressedFile);
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      const fileStream = fs.createWriteStream(destFile);
      await compressing.xz.uncompress(sourceStream, fileStream);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('xz.uncompress(sourceStream, destFile)', async () => {
      const sourceStream = fs.createReadStream(compressedFile);
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      await compressing.xz.uncompress(sourceStream, destFile);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('xz.uncompress(sourceFile, destFile)', async () => {
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      await compressing.xz.uncompress(compressedFile, destFile);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('xz.uncompress(buffer, destFile)', async () => {
      const sourceBuffer = fs.readFileSync(compressedFile);
      const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      await compressing.xz.uncompress(sourceBuffer, destFile);
      assert(fs.existsSync(destFile));
      if (!isWindows) {
        // EOL not equal to linux
        assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      }
    });

    it('xz.uncompress should error if destStream emit error', async () => {
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('write error')));

      let err;
      try {
        await compressing.xz.uncompress(compressedFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'write error');
    });
  });
});
