'use strict';

const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const assert = require('assert');
const mkdirp = require('mkdirp');
const pump = require('pump');
const compressing = require('../..');
const dircompare = require('dir-compare');
const rimraf = require('rimraf');

const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');

describe('test/zip/uncompress_stream.test.js', () => {
  let destDir;
  beforeEach(() => {
    destDir = path.join(os.tmpdir(), uuid.v4());
    mkdirp.sync(destDir);
  });

  afterEach(() => {
    mm.restore();
    destDir && rimraf.sync(destDir);
  });

  it('should be a writable stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);

    const uncompressStream = new compressing.zip.UncompressStream();
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
      stream.on('end', next);

      if (header.type === 'file') {
        stream.pipe(fs.createWriteStream(path.join(destDir, header.name)));
      } else { // directory
        mkdirp(path.join(destDir, header.name)).then(() => stream.resume()).catch(done);
      }
    });
  });

  it('should uncompress according to file path', done => {
    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceFile });

    uncompressStream.on('finish', () => {
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
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
        mkdirp(path.join(destDir, header.name)).then(() => stream.resume()).catch(done);
      }
    });
  });

  it('should uncompress buffer', done => {
    const sourceBuffer = fs.readFileSync(sourceFile);

    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceBuffer });

    uncompressStream.on('finish', () => {
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
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
        mkdirp(path.join(destDir, header.name)).then(() => stream.resume()).catch(done);
      }
    });
  });

  it('should uncompress stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);

    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceStream });

    uncompressStream.on('finish', () => {
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
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
        mkdirp(path.join(destDir, header.name)).then(() => stream.resume()).catch(done);
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
        mkdirp(path.join(destDir, header.name)).then(() => stream.resume()).catch(done);
      }
    });
  });

  it('should uncompress with strip 2', done => {
    const sourceStream = fs.createReadStream(sourceFile);

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
        mkdirp(path.join(destDir, header.name)).then(() => stream.resume()).catch(done);
      }
    });
  });
});
