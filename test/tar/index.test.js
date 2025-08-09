'use strict';

const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressing = require('../..');
const assert = require('assert');
const dircompare = require('dir-compare');

describe('test/tar/index.test.js', () => {
  afterEach(mm.restore);

  describe('tar.compressFile()', () => {
    it('tar.compressFile(file, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tar.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('tar.compressFile(file, stream, { relativePath })', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tar.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
      // TODO 检查 uncompress 之后 relativePath
    });

    it('tar.compressFile(file, stream) should error if file not exist', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'not-exist.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      let err;
      try {
        await compressing.tar.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.message.indexOf('no such file or directory') > -1);
    });

    it('tar.compressFile(file, destStream) should error if destStream emit error', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));
      let err;
      try {
        await compressing.tar.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xx');
    });

    it('tar.compressFile(sourceStream, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      mm(console, 'warn', msg => {
        assert(msg === 'You should specify the size of streamming data by opts.size to prevent all streaming data from loading into memory. If you are sure about memory cost, pass opts.suppressSizeWarning: true to suppress this warning');
      });
      await compressing.tar.compressFile(sourceStream, fileStream, { relativePath: 'xx.log' });
      assert(fs.existsSync(destFile));
    });

    it('tar.compressFile(sourceStream, stream, { size })', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('destFile', destFile);
      const fileStream = fs.createWriteStream(destFile);
      mm(console, 'warn', msg => {
        assert(!msg);
      });
      await compressing.tar.compressFile(sourceStream, fileStream, { relativePath: 'xx.log', size: fs.statSync(sourceFile).size });
      assert(fs.existsSync(destFile));
    });

    it('tar.compressFile(buffer, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceBuffer = fs.readFileSync(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tar.compressFile(sourceBuffer, fileStream, { relativePath: 'xx.log' });
      assert(fs.existsSync(destFile));
    });

    it('should keep stat mode', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures/xxx/bin');
      const originStat = fs.statSync(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tar.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));

      const destDir = path.join(os.tmpdir(), uuid.v4());
      await fs.promises.mkdir(destDir, { recursive: true });
      await compressing.tar.uncompress(destFile, destDir);
      const stat = fs.statSync(path.join(destDir, 'bin'));
      assert(stat.mode === originStat.mode);
      // console.log(destDir);
    });

  });

  describe('tar.compressDir()', () => {
    it('tar.compressDir(dir, destFile)', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('dest', destFile);
      await compressing.tar.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tar.compressDir(dir, destStream)', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const destStream = fs.createWriteStream(destFile);
      // console.log('dest', destFile);
      await compressing.tar.compressDir(sourceDir, destStream);
      assert(fs.existsSync(destFile));
    });

    it('tar.compressDir(dir, destStream, { ignoreBase: true })', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const destStream = fs.createWriteStream(destFile);
      // console.log('dest', destFile);
      await compressing.tar.compressDir(sourceDir, destStream, { ignoreBase: true });
      assert(fs.existsSync(destFile));
    });

    it('tar.compressDir(dir, destStream) should return promise', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      // console.log('dest', destFile);
      await compressing.tar.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tar.compressDir(dir, destStream) should reject when destStream emit error', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const destStream = fs.createWriteStream(destFile);
      // console.log('dest', destFile);
      setImmediate(() => {
        destStream.emit('error', new Error('xxx'));
      });
      let err;
      try {
        await compressing.tar.compressDir(sourceDir, destStream);
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xxx');
    });

    it('tar.compressDir(dir, destStream) should reject when destFile cannot be created', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join('/permision-deny');
      let err;
      try {
        await compressing.tar.compressDir(sourceDir, destFile);
      } catch (e) {
        err = e;
      }
      if (process.platform === 'win32') return;

      assert(err);
      assert(err.message.includes('EACCES: permission denied') || err.message.includes('read-only file system'));
    });
  });

  describe('tar.uncompress()', () => {
    it('tar.uncompress(sourceFile, destDir)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.tar');
      const destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      await compressing.tar.uncompress(sourceFile, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    it('tar.uncompress(sourceStream, destDir)', async () => {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xxx.tar'));
      const destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      await compressing.tar.uncompress(sourceStream, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    it('tar.uncompress(sourceBuffer, destDir)', async () => {
      const sourceBuffer = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xxx.tar'));
      const destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      // console.log('sourceBuffer', destDir, originalDir);
      await compressing.tar.uncompress(sourceBuffer, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);

      const destStat = fs.statSync(path.join(destDir, 'xxx/bin'));
      const originStat = fs.statSync(path.join(originalDir, 'bin'));
      assert(originStat.mode);
      assert(destStat.mode);
    });
  });
});
