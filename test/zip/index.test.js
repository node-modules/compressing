const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const assert = require('assert');
const dircompare = require('dir-compare');
const compressing = require('../..');

const isWindows = os.platform() === 'win32';

describe('test/zip/index.test.js', () => {
  let destDir;
  afterEach(() => {
    if (destDir) {
      try {
        fs.rmSync(destDir, { force: true, recursive: true });
      } catch (e) {
        console.error('ignore rm dir error: %s', e);
      }
    }
  });

  describe('zip.compressFile()', () => {
    it('zip.compressFile(file, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.zip.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressFile(file, stream) should handle error if file not exist', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log', 'not_exist');
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      let err;
      try {
        await compressing.zip.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err);
    });

    it('zip.compressFile(file, destStream) should error if destStream emit error', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));
      let err;
      try {
        await compressing.zip.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err);
    });

    it('zip.compressFile(buffer, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceBuffer = fs.readFileSync(sourceFile);
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.zip.compressFile(sourceBuffer, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
    });

    it('zip.compressFile(sourceStream, targetStream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.zip.compressFile(sourceStream, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
    });
  });

  describe('zip.compressDir()', () => {
    it('zip.compressDir(dir, destFile)', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      await compressing.zip.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream)', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      await compressing.zip.compressDir(sourceDir, destStream);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream, { ignoreBase: true })', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      await compressing.zip.compressDir(sourceDir, destStream, { ignoreBase: true });
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream) should return promise', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      console.log('dest', destFile);
      await compressing.zip.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream) should reject when destStream emit error', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      destDir = path.join(os.tmpdir(), uuid.v4());
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, uuid.v4() + '.zip');
      const destStream = fs.createWriteStream(destFile);
      setImmediate(() => {
        destStream.emit('error', new Error('xxx'));
      });
      try {
        await compressing.zip.compressDir(sourceDir, destStream);
      } catch (e) {
        assert(e);
        assert(e.message === 'xxx');
      }
    });

    it('zip.compressDir(dir, destStream) should reject when destFile cannot be created', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join('/permision-deny');
      let err;
      try {
        await compressing.zip.compressDir(sourceDir, destFile);
      } catch (e) {
        err = e;
      }
      if (process.platform === 'win32') return;
      assert(err);
      assert(err.message.includes('EACCES: permission denied') || err.message.includes('read-only file system'));
    });
  });

  describe('zip.uncompress()', () => {
    it('zip.uncompress(sourceFile, destDir)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      await compressing.zip.uncompress(sourceFile, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    it('zip.uncompress(sourceFile, destDir) support file mode', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      await compressing.zip.uncompress(sourceFile, destDir, {
        mode: 32804,
      });
      const stat = fs.statSync(path.join(destDir, 'xxx', 'foo'));
      if (isWindows) {
        const statMode = '0' + (stat.mode & parseInt('777', 8)).toString(8);
        assert.equal(statMode, '0444');
      } else {
        assert(stat.mode === 32804);
      }
    });

    // only test on local
    it.skip('zip.uncompress(sourceFile, destDir) support chinese gbk path', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'chinese-path-test.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      await compressing.zip.uncompress(sourceFile, destDir, {
        zipFileNameEncoding: 'gbk',
      });
      assert(fs.readdirSync(destDir).indexOf('发布周期.md') >= 0);
    });

    it('zip.uncompress(sourceFile, destDir) work on zipFileNameEncoding = gbk', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      await compressing.zip.uncompress(sourceFile, destDir, {
        zipFileNameEncoding: 'gbk',
        strip: 1,
      });
      assert(fs.readdirSync(destDir).indexOf('foo') >= 0);
    });

    it('zip.uncompress(sourceFile, destDir) work on zipFileNameEncoding = utf8', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      await compressing.zip.uncompress(sourceFile, destDir, {
        zipFileNameEncoding: 'utf8',
        strip: 1,
      });
      assert(fs.readdirSync(destDir).indexOf('foo') >= 0);
    });

    it('zip.uncompress(sourceFile, destDir) work on zipFileNameEncoding = utf-8', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      await compressing.zip.uncompress(sourceFile, destDir, {
        zipFileNameEncoding: 'utf-8',
        strip: 1,
      });
      assert(fs.readdirSync(destDir).indexOf('foo') >= 0);
    });

    it('zip.uncompress(sourceFile, destDir) support absolute path', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'contain-absolute-path.zip');
      destDir = path.join(os.tmpdir(), uuid.v4());
      await compressing.zip.uncompress(sourceFile, destDir, { strip: 1 });
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
      fs.rmSync(destDir, { force: true, recursive: true });
    });

    it('zip.uncompress(sourceStream, destDir)', async () => {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xxx.zip'));
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      await compressing.zip.uncompress(sourceStream, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });

    it('zip.uncompress(sourceBuffer, destDir)', async () => {
      const sourceBuffer = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xxx.zip'));
      destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
      await compressing.zip.uncompress(sourceBuffer, destDir);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
    });
  });
  it('uncompress should keep stat mode', async () => {
    const sourceFile = path.join(__dirname, '..', 'fixtures/xxx/bin');
    const originStat = fs.statSync(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    console.log('dest', destFile);
    const fileStream = fs.createWriteStream(destFile);
    await compressing.zip.compressFile(sourceFile, fileStream);
    assert(fs.existsSync(destFile));

    destDir = path.join(os.tmpdir(), uuid.v4());
    fs.mkdirSync(destDir, { recursive: true });
    await compressing.zip.uncompress(destFile, destDir);
    const stat = fs.statSync(path.join(destDir, 'bin'));
    assert(stat.mode === originStat.mode);
    console.log(destDir);
  });
});
