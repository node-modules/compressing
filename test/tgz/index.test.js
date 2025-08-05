const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const assert = require('assert');
const dircompare = require('dir-compare');
const compressing = require('../..');

const isWindows = os.platform() === 'win32';

describe('test/tgz/index.test.js', () => {
  describe('tgz.compressFile()', () => {
    it('tgz.compressFile(file, stream)', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tgz.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressFile(file, stream, { relativePath })', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      console.log('dest', destFile);
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
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      await compressing.tgz.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));

      const destDir = path.join(os.tmpdir(), uuid.v4());
      await fs.promises.mkdir(destDir, { recursive: true });
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
      console.log('dest', destFile);
      await compressing.tgz.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream)', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      await compressing.tgz.compressDir(sourceDir, destStream);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream, { ignoreBase: true })', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      await compressing.tgz.compressDir(sourceDir, destStream, { ignoreBase: true });
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream) should return promise', async () => {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      console.log('dest', destFile);
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
      const destDir = path.join(os.tmpdir(), uuid.v4());
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
      const format = stats => '0' + (stats.mode & parseInt('777', 8)).toString(8);
      assert(format(originStat) === format(destStat));
    });

    it('tgz.uncompress(sourceFile, destDir) with symlink', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'symlink.tgz');
      const destDir = path.join(os.tmpdir(), uuid.v4());
      const originalDir = path.join(__dirname, '..', 'fixtures', 'symlink');
      await compressing.tgz.uncompress(sourceFile, destDir);
      // console.log(destDir);

      assert(fs.lstatSync(path.join(destDir, 'README.md')).isSymbolicLink());
      assert(fs.lstatSync(path.join(destDir, 'cli')).isSymbolicLink());
      assert(fs.lstatSync(path.join(destDir, 'node_modules/enums')).isSymbolicLink());
      assert(fs.readFileSync(path.join(destDir, 'README.md'), 'utf-8').includes('Usage'));

      if (isWindows) {
        const names = fs.readdirSync(destDir);
        console.log(names);
        assert.equal(names.length, 3);
      } else {
        const res = dircompare.compareSync(originalDir, destDir);
        assert.equal(res.distinct, 0);
      }

      const destStat = fs.lstatSync(path.join(destDir, 'cli'));
      const originStat = fs.lstatSync(path.join(originalDir, 'cli'));
      const format = stats => '0' + (stats.mode & parseInt('777', 8)).toString(8);
      assert.equal(format(originStat), format(destStat));
    });

    it('tgz.uncompress(sourceStream, destDir)', async () => {
      const sourceStream = fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xxx.tgz'));
      const destDir = path.join(os.tmpdir(), uuid.v4());
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
      const destDir = path.join(os.tmpdir(), uuid.v4());
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
