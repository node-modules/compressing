'use strict';

const os = require('os');
const fs = require('fs');
const uuid = require('uuid');
const path = require('path');
const assert = require('assert');
const pipe = require('multipipe');
const compressing = require('../..');

const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log.gz');

describe('test/gzip/uncompress_stream.test.js', () => {
  it('should be transform stream', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');

    const sourceStream = fs.createReadStream(sourceFile);
    const uncompressStream = new compressing.gzip.UncompressStream();
    const destStream = fs.createWriteStream(destFile);
    pipe(sourceStream, uncompressStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      done();
    });
  });

  it('should uncompress according to file path', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');

    const uncompressStream = new compressing.gzip.UncompressStream({ source: sourceFile });
    const destStream = fs.createWriteStream(destFile);
    pipe(uncompressStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      done();
    });
  });

  it('should uncompress buffer', done => {
    const sourceBuffer = fs.readFileSync(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');

    const destStream = fs.createWriteStream(destFile);
    const uncompressStream = new compressing.gzip.UncompressStream({ source: sourceBuffer });
    pipe(uncompressStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      done();
    });
  });

  it('should uncompress stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');

    const destStream = fs.createWriteStream(destFile);
    const uncompressStream = new compressing.gzip.UncompressStream({ source: sourceStream });
    pipe(uncompressStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      assert(fs.readFileSync(destFile, 'utf8') === fs.readFileSync(originalFile, 'utf8'));
      done();
    });
  });

  it('should emit error if sourceFile does not exit', done => {
    const sourceFile = 'file-not-exist';
    const uncompressStream = new compressing.gzip.UncompressStream({ source: sourceFile });
    uncompressStream.on('error', err => {
      assert(err);
      done();
    });
  });

  it('should emit error if sourceStream emit error', done => {
    const sourceFile = 'file-not-exist';
    const sourceStream = fs.createReadStream(sourceFile);
    const uncompressStream = new compressing.gzip.UncompressStream({ source: sourceStream });
    uncompressStream.on('error', err => {
      assert(err && err.code === 'ENOENT');
      done();
    });
  });

});
