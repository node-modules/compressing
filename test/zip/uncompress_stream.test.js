const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const assert = require('assert');
const mkdirp = require('mkdirp');
const { pipeline: pump } = require('stream');
const dircompare = require('dir-compare');
const { pipelinePromise } = require('../util');
const compressing = require('../..');

const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');

describe('test/zip/uncompress_stream.test.js', () => {
  afterEach(mm.restore);

  it('should be a writable stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream();
    mkdirp.sync(destDir);
    pump(sourceStream, uncompressStream, err => {
      assert(!err);
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
      done();
    });

    uncompressStream.on('entry', (header, stream, next) => {
      if (header.type === 'file') {
        pipelinePromise(stream, fs.createWriteStream(path.join(destDir, header.name)))
          .then(next)
          .catch(done);
      } else { // directory
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
        stream.on('end', next);
      }
    });
  });

  it('should uncompress according to file path', done => {
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceFile });
    mkdirp.sync(destDir);

    uncompressStream.on('finish', () => {
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      const names = fs.readdirSync(path.join(destDir, 'xxx'));
      console.log(names);
      assert.equal(res.distinct, 0);
      assert.equal(res.equal, 5);
      assert.equal(res.totalFiles, 4);
      assert.equal(res.totalDirs, 1);
      done();
    });

    uncompressStream.on('entry', (header, stream, next) => {
      if (header.type === 'file') {
        pipelinePromise(stream, fs.createWriteStream(path.join(destDir, header.name)))
          .then(next)
          .catch(done);
      } else { // directory
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
        stream.on('end', next);
      }
    });
  });

  it('should uncompress buffer', done => {
    const sourceBuffer = fs.readFileSync(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceBuffer });
    mkdirp.sync(destDir);

    uncompressStream.on('finish', () => {
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      const names = fs.readdirSync(path.join(destDir, 'xxx'));
      console.log(names);
      assert.equal(res.distinct, 0);
      assert.equal(res.equal, 5);
      assert.equal(res.totalFiles, 4);
      assert.equal(res.totalDirs, 1);
      done();
    });

    uncompressStream.on('entry', (header, stream, next) => {
      if (header.type === 'file') {
        pipelinePromise(stream, fs.createWriteStream(path.join(destDir, header.name)))
          .then(next)
          .catch(done);
      } else { // directory
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
        stream.on('end', next);
      }
    });
  });

  it('should uncompress stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceStream });
    mkdirp.sync(destDir);

    uncompressStream.on('finish', () => {
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      const names = fs.readdirSync(path.join(destDir, 'xxx'));
      console.log(names);
      assert.equal(res.distinct, 0);
      assert.equal(res.equal, 5);
      assert.equal(res.totalFiles, 4);
      assert.equal(res.totalDirs, 1);
      done();
    });

    uncompressStream.on('entry', (header, stream, next) => {
      if (header.type === 'file') {
        pipelinePromise(stream, fs.createWriteStream(path.join(destDir, header.name)))
          .then(next)
          .catch(done);
      } else { // directory
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
        stream.on('end', next);
      }
    });
  });

  it('should emit error if sourceFile does not exit', done => {
    const sourceFile = 'file-not-exist';
    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceFile });
    uncompressStream.on('error', err => {
      assert(err);
      done();
    });
  });

  it('should emit error if sourceStream emit error', done => {
    const sourceFile = 'file-not-exist';
    const sourceStream = fs.createReadStream(sourceFile);
    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceStream });
    uncompressStream.on('error', err => {
      assert(err && err.code === 'ENOENT');
      done();
    });
  });

  it('should emit error if utils.streamToBuffer throw error', done => {
    const sourceStream = fs.createReadStream(sourceFile);

    const uncompressStream = new compressing.zip.UncompressStream();
    pump(sourceStream, uncompressStream, err => {
      assert(err === 'mockError');
      done();
    });

    sourceStream.emit('error', 'mockError');
  });

  it('should uncompress with strip 1', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream({ strip: 1 });
    mkdirp.sync(destDir);
    pump(sourceStream, uncompressStream, err => {
      assert(!err);
      const res = dircompare.compareSync(originalDir, destDir);
      assert(res.distinct === 0);
      assert(res.equal === 5);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 1);
      done();
    });

    uncompressStream.on('entry', (header, stream, next) => {
      stream.on('end', next);

      if (header.type === 'file') {
        stream.pipe(fs.createWriteStream(path.join(destDir, header.name)));
      } else { // directory
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
      }
    });
  });

  it('should uncompress with strip 2', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream({ strip: 2 });
    mkdirp.sync(destDir);
    pump(sourceStream, uncompressStream, err => {
      assert(!err);
      const res = dircompare.compareSync(path.join(__dirname, '../fixtures/xxx-strip2'), destDir);
      assert(res.distinct === 0);
      assert(res.equal === 4);
      assert(res.totalFiles === 4);
      assert(res.totalDirs === 0);
      done();
    });

    uncompressStream.on('entry', (header, stream, next) => {
      stream.on('end', next);

      if (header.type === 'file') {
        stream.pipe(fs.createWriteStream(path.join(destDir, header.name)));
      } else { // directory
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
      }
    });
  });
});

it('should emit error if uncompress source is undefined', done => {
  const timeout = setTimeout(() => {
    done('uncompress timeout');
  }, 1000);
  try {
    compressing.zip.uncompress(undefined, originalDir)
      .finally(() => clearTimeout(timeout));
  } catch (err) {
    clearTimeout(timeout);
    assert(err.name === 'IlligalSourceError');
    assert(err.message === 'Type is not supported, must be a file path, file buffer, or a readable stream');
    done();
  }
});
