'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const compressing = require('../..');
const assert = require('power-assert');
const dircompare = require('dir-compare');

describe('test/zip/index.test.js', () => {
  let destDir;
  afterEach(() => {
    rimraf.sync(destDir);
  });

  describe('zip.compressFile()', () => {
    it('zip.compressFile(file, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.zip.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressFile(file, stream) should handle error if file not exist', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log', 'not_exist');
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      let err;
      try {
        yield compressing.zip.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err);
    });

    it('zip.compressFile(file, destStream) should error if destStream emit error', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));
      let err;
      try {
        yield compressing.zip.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err);
    });

    it('zip.compressFile(buffer, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceBuffer = fs.readFileSync(sourceFile);
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.zip.compressFile(sourceBuffer, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
    });

    it('zip.compressFile(sourceStream, targetStream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.zip.compressFile(sourceStream, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
    });
  });

  describe('zip.compressDir()', () => {
    it('zip.compressDir(dir, destFile)', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      yield compressing.zip.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream)', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      yield compressing.zip.compressDir(sourceDir, destStream);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream, { ignoreBase: true })', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      yield compressing.zip.compressDir(sourceDir, destStream, { ignoreBase: true });
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream) should return promise', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      yield compressing.zip.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream) should reject when destStream emit error', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      mkdirp.sync(destDir);
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      const destStream = fs.createWriteStream(destFile);
      setImmediate(() => {
        destStream.emit('error', new Error('xxx'));
      });
      try {
        yield compressing.zip.compressDir(sourceDir, destStream);
      } catch (e) {
        assert(e);
        assert(e.message === 'xxx');
      }
    });

    it('zip.compressDir(dir, destStream) should reject when destFile cannot be created', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join('/permision-deny');
      let err;
      try {
        yield compressing.zip.compressDir(sourceDir, destFile);
      } catch (e) {
        err = e;
      }
      if (process.platform === 'win32') return;
      assert(err);
      assert(err.message.includes('EACCES: permission denied') || err.message.includes('read-only file system'));
    });
  });

  describe('zip.uncompress()', () => {
    it('zip.uncompress(sourceFile, destDir)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      yield compressing.zip.uncompress(sourceFile, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    // only test on local
    it.skip('zip.uncompress(sourceFile, destDir) support chinese gbk path', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'chinese-path-test.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      yield compressing.zip.uncompress(sourceFile, destDir, {
        zipFileNameEncoding: 'gbk',
      });
      assert(fs.readdirSync(destDir).indexOf('发布周期.md') >= 0);
    });

    it('zip.uncompress(sourceFile, destDir) work on zipFileNameEncoding = gbk', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      yield compressing.zip.uncompress(sourceFile, destDir, {
        zipFileNameEncoding: 'gbk',
        strip: 1,
      });
      assert(fs.readdirSync(destDir).indexOf('foo') >= 0);
    });

    it('zip.uncompress(sourceFile, destDir) work on zipFileNameEncoding = utf8', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      yield compressing.zip.uncompress(sourceFile, destDir, {
        zipFileNameEncoding: 'utf8',
        strip: 1,
      });
      assert(fs.readdirSync(destDir).indexOf('foo') >= 0);
    });

    it('zip.uncompress(sourceFile, destDir) work on zipFileNameEncoding = utf-8', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      yield compressing.zip.uncompress(sourceFile, destDir, {
        zipFileNameEncoding: 'utf-8',
        strip: 1,
      });
      assert(fs.readdirSync(destDir).indexOf('foo') >= 0);
    });

    it('zip.uncompress(sourceFile, destDir) support absolute path', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'contain-absolute-path.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      yield compressing.zip.uncompress(sourceFile, destDir, { strip: 1 });
      const names = fs.readdirSync(destDir);
      names.sort();
      assert.deepEqual(names, [
        '262149.html',
        '6y6r_65538.html',
        '98305.html',
        'How-to-articles_393223.html',
        'attachments',
        'images',
        'index.html',
        'styles',
      ]);
      rimraf.sync(destDir);
    });

    it('zip.uncompress(sourceStream, destDir)', function* () {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xxx.zip'));
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      yield compressing.zip.uncompress(sourceStream, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    it('zip.uncompress(sourceBuffer, destDir)', function* () {
      const sourceBuffer = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xxx.zip'));
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      yield compressing.zip.uncompress(sourceBuffer, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });
  });
  it('uncompress should keep stat mode', function* () {
    const sourceFile = path.join(__dirname, '..', 'fixtures/xxx/bin');
    const originStat = fs.statSync(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    console.log('dest', destFile);
    const fileStream = fs.createWriteStream(destFile);
    yield compressing.zip.compressFile(sourceFile, fileStream);
    assert(fs.existsSync(destFile));

    destDir = path.join(os.tmpdir(), uuid.v4());
    yield mkdirp(destDir);
    yield compressing.zip.uncompress(destFile, destDir);
    const stat = fs.statSync(path.join(destDir, 'bin'));
    assert(stat.mode === originStat.mode);
    console.log(destDir);
  });
});
