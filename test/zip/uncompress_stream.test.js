'use strict';

const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const assert = require('assert');
const mkdirp = require('mkdirp');
const pipe = require('multipipe');
const compressing = require('../..');
const dircompare = require('dir-compare');

const originalDir = path.join(__dirname, '..', 'fixtures', 'xxx');
const sourceFile = path.join(__dirname, '..', 'fixtures', 'xxx.zip');

describe('test/zip/uncompress_stream.test.js', () => {
  afterEach(mm.restore);

  it('should be a writable stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream();
    mkdirp.sync(destDir);
    pipe(sourceStream, uncompressStream, err => {
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
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
      }
    });
  });

  it('should uncompress according to file path', done => {
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceFile });
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
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
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

  it('should uncompress stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destDir = path.join(os.tmpdir(), uuid.v4());

    const uncompressStream = new compressing.zip.UncompressStream({ source: sourceStream });
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
        mkdirp(path.join(destDir, header.name), err => {
          if (err) return done(err);
          stream.resume();
        });
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
});
