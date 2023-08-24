const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const assert = require('assert');
const mkdirp = require('mkdirp');
const pump = require('pump');
const dircompare = require('dir-compare');
const streamifier = require('streamifier');
const { pipelinePromise } = require('../util');
const compressing = require('../..');

const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.tar');

describe('test/tar/uncompress_stream.test.js', () => {
  afterEach(mm.restore);

  it('should be a writable stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.tar.UncompressStream();
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

    const uncompressStream = new compressing.tar.UncompressStream({ source: sourceFile });
    mkdirp.sync(destDir);

    uncompressStream.on('finish', () => {
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

  it('should uncompress buffer', done => {
    const sourceBuffer = fs.readFileSync(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.tar.UncompressStream({ source: sourceBuffer });
    mkdirp.sync(destDir);

    uncompressStream.on('finish', () => {
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      // console.log(res);
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

    const uncompressStream = new compressing.tar.UncompressStream({ source: sourceStream });
    mkdirp.sync(destDir);

    uncompressStream.on('finish', () => {
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

  it('should emit error if sourceFile does not exit', done => {
    const sourceFile = 'file-not-exist';
    const uncompressStream = new compressing.tar.UncompressStream({ source: sourceFile });
    uncompressStream.on('error', err => {
      assert(err);
      done();
    });
  });

  it('should emit error if sourceStream emit error', done => {
    const sourceFile = 'file-not-exist';
    const sourceStream = fs.createReadStream(sourceFile);
    const uncompressStream = new compressing.tar.UncompressStream({ source: sourceStream });
    uncompressStream.on('error', err => {
      assert(err && err.code === 'ENOENT');
      done();
    });
  });

  it('should emit error if stream created by streamifier.createReadStream emit error', done => {
    const original = streamifier.createReadStream;
    mm(streamifier, 'createReadStream', function() {
      const result = original.apply(streamifier, arguments);
      setImmediate(() => result.emit('error', 'mockError'));
      return result;
    });
    const sourceBuffer = fs.readFileSync(sourceFile);
    const uncompressStream = new compressing.tar.UncompressStream({ source: sourceBuffer });
    uncompressStream.on('error', err => {
      assert(err === 'mockError');
      done();
    });
  });
});
