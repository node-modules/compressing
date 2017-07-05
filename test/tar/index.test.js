'use strict';

const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressing = require('../..');
const assert = require('power-assert');
const dircompare = require('dir-compare');

describe('test/tar/index.test.js', () => {
  afterEach(mm.restore);

  describe('tar.compressFile()', () => {
    it('tar.compressFile(file, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.tar.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('tar.compressFile(file, stream, { relativePath })', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.tar.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
      // TODO 检查 uncompress 之后 relativePath
    });

    it('tar.compressFile(file, stream) should error if file not exist', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'not-exist.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      let err;
      try {
        yield compressing.tar.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.message.indexOf('no such file or directory') > -1);
    });

    it('tar.compressFile(file, destStream) should error if destStream emit error', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));
      let err;
      try {
        yield compressing.tar.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xx');
    });

    it('tar.compressFile(sourceStream, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      mm(console, 'warn', msg => {
        assert(msg === 'You should specify the size of streamming data by opts.size to prevent all streaming data from loading into memory. If you are sure about memory cost, pass opts.supressSizeWarning: true to suppress this warning');
      });
      yield compressing.tar.compressFile(sourceStream, fileStream, { relativePath: 'xx.log' });
      assert(fs.existsSync(destFile));
    });

    it('tar.compressFile(sourceStream, stream, { size })', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      mm(console, 'warn', msg => {
        assert(!msg);
      });
      yield compressing.tar.compressFile(sourceStream, fileStream, { relativePath: 'xx.log', size: fs.statSync(sourceFile).size });
      assert(fs.existsSync(destFile));
    });

    it('tar.compressFile(buffer, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceBuffer = fs.readFileSync(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.tar.compressFile(sourceBuffer, fileStream, { relativePath: 'xx.log' });
      assert(fs.existsSync(destFile));
    });
  });

  describe('tar.compressDir()', () => {
    it('tar.compressDir(dir, destFile)', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      console.log('dest', destFile);
      yield compressing.tar.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tar.compressDir(dir, destStream)', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      compressing.tar.compressDir(sourceDir, destStream);
      assert(fs.existsSync(destFile));
    });

    it('tar.compressDir(dir, destStream, { ignoreBase: true })', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      yield compressing.tar.compressDir(sourceDir, destStream, { ignoreBase: true });
      assert(fs.existsSync(destFile));
    });

    it('tar.compressDir(dir, destStream) should return promise', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      console.log('dest', destFile);
      yield compressing.tar.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tar.compressDir(dir, destStream) should reject when destStream emit error', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      setImmediate(() => {
        destStream.emit('error', new Error('xxx'));
      });
      let err;
      try {
        yield compressing.tar.compressDir(sourceDir, destStream);
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xxx');
    });

    it('tar.compressDir(dir, destStream) should reject when destFile cannot be created', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join('/permision-deny');
      let err;
      try {
        yield compressing.tar.compressDir(sourceDir, destFile);
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.message.indexOf('EACCES: permission denied') > -1);
    });
  });

  describe('tar.uncompress()', () => {
    it('tar.uncompress(sourceFile, destDir)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.tar');
      const destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      yield compressing.tar.uncompress(sourceFile, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    it('tar.uncompress(sourceStream, destDir)', function* () {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xxx.tar'));
      const destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      yield compressing.tar.uncompress(sourceStream, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    it('tar.uncompress(sourceBuffer, destDir)', function* () {
      const sourceBuffer = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xxx.tar'));
      const destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      // console.log('sourceBuffer', destDir, originalDir);
      yield compressing.tar.uncompress(sourceBuffer, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);

      const destStat = fs.statSync(path.join(destDir, 'xxx/bin'));
      const originStat = fs.statSync(path.join(originalDir, 'bin'));
      assert(originStat.mode === destStat.mode);
    });
  });
});
