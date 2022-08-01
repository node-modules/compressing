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
const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.tgz');

describe('test/tgz/uncompress_stream.test.js', () => {
  let destDir;
  afterEach(() => {
    mm.restore();
    destDir && rimraf.sync(destDir);
  });

  it.skip('should be a writable stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.tgz.UncompressStream();
    mkdirp.sync(destDir);
    pump(sourceStream, uncompressStream, err => {
      console.error(err);
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
    destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.tgz.UncompressStream({ source: sourceFile });
    mkdirp.sync(destDir);

    uncompressStream.on('finish', () => {
      const res = dircompare.compareSync(originalDir, path.join(destDir, 'xxx'));
      assert(res.distinct === 0);
      // assert(res.equal === 5);
      assert(res.total === 5);
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
    destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.tgz.UncompressStream({ source: sourceBuffer });
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
    destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.tgz.UncompressStream({ source: sourceStream });
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
    const uncompressStream = new compressing.tgz.UncompressStream({ source: sourceFile });
    uncompressStream.on('error', err => {
      assert(err);
      done();
    });
  });

  it('should emit error if sourceStream emit error', done => {
    const sourceFile = 'file-not-exist';
    const sourceStream = fs.createReadStream(sourceFile);
    const uncompressStream = new compressing.tgz.UncompressStream({ source: sourceStream });
    uncompressStream.on('error', err => {
      assert(err && err.code === 'ENOENT');
      done();
    });
  });
});
