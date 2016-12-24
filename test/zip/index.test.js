'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressing = require('../..');
const assert = require('power-assert');

describe('test/zip/index.test.js', () => {
  describe('zip.compressFile()', () => {
    it('zip.compressFile(file, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.zip.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressFile(file, destStream) should error if destStream emit error', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
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
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.zip.compressFile(sourceBuffer, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
    });

    it('zip.compressFile(sourceStream, targetStream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const sourceStream = fs.createReadStream(sourceFile);
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressing.zip.compressFile(sourceStream, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
    });
  });

  describe('zip.compressDir()', () => {
    it('zip.compressDir(dir, destFile)', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
      console.log('dest', destFile);
      yield compressing.zip.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream)', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      yield compressing.zip.compressDir(sourceDir, destStream);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream, { ignoreBase: true })', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      yield compressing.zip.compressDir(sourceDir, destStream, { ignoreBase: true });
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream) should return promise', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
      console.log('dest', destFile);
      yield compressing.zip.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('zip.compressDir(dir, destStream) should reject when destStream emit error', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
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
      assert(err);
      assert(err.message.indexOf('EACCES: permission denied') > -1);
    });
  });
});
