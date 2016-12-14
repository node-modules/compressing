'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressible = require('../..');
const assert = require('power-assert');

describe('test/tgz/index.test.js', () => {
  describe('tgz.compressFile()', () => {
    it('tgz.compressFile(file, stream)', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressible.tgz.compressFile(sourceFile, fileStream);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressFile(file, stream, { relativePath })', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      console.log('dest', destFile);
      const fileStream = fs.createWriteStream(destFile);
      yield compressible.tgz.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      assert(fs.existsSync(destFile));
      // TODO 检查 uncompress 之后 relativePath
    });

    it('tgz.compressFile(file, stream) should error if file not exist', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'not-exist.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const fileStream = fs.createWriteStream(destFile);
      let err;
      try {
        yield compressible.tgz.compressFile(sourceFile, fileStream, { relativePath: 'dd/dd.log' });
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.message.indexOf('no such file or directory') > -1);
    });

    it('tgz.compressFile(file, destStream) should error if destStream emit error', function* () {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const fileStream = fs.createWriteStream(destFile);
      setImmediate(() => fileStream.emit('error', new Error('xx')));
      let err;
      try {
        yield compressible.tgz.compressFile(sourceFile, fileStream);
      } catch (e) {
        err = e;
      }
      assert(err && err.message === 'xx');
    });

  });

  describe('tgz.compressDir()', () => {
    it('tgz.compressDir(dir, destFile)', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      console.log('dest', destFile);
      yield compressible.tgz.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream)', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      yield compressible.tgz.compressDir(sourceDir, destStream);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream, { ignoreBase: true })', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const destStream = fs.createWriteStream(destFile);
      console.log('dest', destFile);
      yield compressible.tgz.compressDir(sourceDir, destStream, { ignoreBase: true });
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream) should return promise', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      console.log('dest', destFile);
      yield compressible.tgz.compressDir(sourceDir, destFile);
      assert(fs.existsSync(destFile));
    });

    it('tgz.compressDir(dir, destStream) should reject when destStream emit error', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join(os.tmpdir(), uuid.v4() + '.tgz');
      const destStream = fs.createWriteStream(destFile);
      setImmediate(() => {
        destStream.emit('error', new Error('xxx'));
      });
      let err;
      try {
        yield compressible.tgz.compressDir(sourceDir, destStream);
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.message === 'xxx');
    });

    it('tgz.compressDir(dir, destStream) should reject when destFile cannot be created', function* () {
      const sourceDir = path.join(__dirname, '..', 'fixtures');
      const destFile = path.join('/permision-deny');
      let err;
      try {
        yield compressible.tgz.compressDir(sourceDir, destFile);
      } catch (e) {
        err = e;
      }
      assert(err);
      assert(err.message.indexOf('EACCES: permission denied') > -1);
    });
  });
});
