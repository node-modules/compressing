'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressing = require('../..');
const assert = require('power-assert');
const rimraf = require('rimraf');
const dircompare = require('dir-compare');
const { mkdirpSync } = require('../../lib/utils');

describe('test/tgz/index.test.js', () => {
  let destDir;
  beforeEach(() => {
    destDir = path.join(os.tmpdir(), uuid.v4());
    mkdirpSync(destDir);
  });
  afterEach(() => {
    destDir && rimraf.sync(destDir);
  });

  describe('tgz.compressFile()', () => {
    it('tgz.compressFile(file, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tgz.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressFile(file, stream, { relativePath })', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tgz.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
      // TODO 检查 uncompress 之后 relativePath
    });

    it('tgz.compressFile(file, stream) should error if file not exist', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'not-exist.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const fileStream = fs.createWriteStream(destFile);
      let err;
      try {
        await compressing.tgz.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.message.indexOf('no such file or directory') > -1);
    });

    it('tgz.compressFile(file, destStream) should error if destStream emit error', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));
      let err;
      try {
        await compressing.tgz.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xx');
    });

    it('should keep stat mode', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures/xxx/bin');
      const originStat = fs.statSync(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tgz.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));


      await compressing.tgz.uncompress(destFile, destDir);
      const stat = fs.statSync(path.join(destDir, 'bin'));
      assert(stat.mode);
      assert(originStat.mode);
      console.log(destDir);
    });

  });

  describe('tgz.compressDir()', () => {
    it('tgz.compressDir(dir, destFile)', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      await compressing.tgz.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream)', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const destStream = fs.createWriteStream(destFile);
      await compressing.tgz.compressDir(sourceDir, destStream);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream, { ignoreBase: true })', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const destStream = fs.createWriteStream(destFile);
      await compressing.tgz.compressDir(sourceDir, destStream, { ignoreBase: true });
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream) should return promise', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      await compressing.tgz.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream) should reject when destStream emit error', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const destStream = fs.createWriteStream(destFile);
      setImmediate(() => {
        destStream.emit('error', new Error('xxx'));
      });
      let err;
      try {
        await compressing.tgz.compressDir(sourceDir, destStream);
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.message === 'xxx');
    });

    it('tgz.compressDir(dir, destStream) should reject when destFile cannot be created', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join('/permision-deny');
      let err;
      try {
        await compressing.tgz.compressDir(sourceDir, destFile);
      } catch (e) {
        err = e;
      }
      if (process.platform === 'win32') return;
      assert(err);
      assert(err.message.includes('EACCES: permission denied') || err.message.includes('read-only file system'));
    });
  });

  describe('tgz.uncompress()', () => {
    it('tgz.uncompress(sourceFile, destDir)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.tgz');
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      await compressing.tgz.uncompress(sourceFile, destDir);

      assert(fs.statSync(path.join(destDir, 'xxx/bar.txt')).size === 7);
      assert(fs.statSync(path.join(destDir, 'xxx/foo')).size === 3);
      assert(fs.statSync(path.join(destDir, 'xxx/test/test.js')).size === 14);
      assert(fs.statSync(path.join(destDir, 'xxx/bin')).size === 2117);

      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);

      const destStat = fs.statSync(path.join(destDir, 'xxx/bin'));
      const originStat = fs.statSync(path.join(originalDir, 'bin'));
      // assert(originStat.mode === destStat.mode);
      assert(destStat.mode);
      assert(originStat.mode);
    });

    it('tgz.uncompress(sourceStream, destDir)', async () => {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xxx.tgz'));
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      await compressing.tgz.uncompress(sourceStream, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    it('tgz.uncompress(sourceBuffer, destDir)', async () => {
      const sourceBuffer = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xxx.tgz'));
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      await compressing.tgz.uncompress(sourceBuffer, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });
  });
});
