const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const { pipeline: pump } = require('stream');
const compressing = require('../..');
const assert = require('assert');

describe('test/xz/file_stream.test.js', () => {
  it('should be a transform stream', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
    // console.log('destFile', destFile);
    const xzStream = new compressing.xz.FileStream();
    const destStream = fs.createWriteStream(destFile);
    pump(sourceStream, xzStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('should compress according to file path', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
    // console.log('destFile', destFile);
    const xzStream = new compressing.xz.FileStream({ source: sourceFile });
    const destStream = fs.createWriteStream(destFile);
    pump(xzStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('should compress file into Buffer', async () => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const xzStream = new compressing.xz.FileStream({ source: sourceFile });
    const xzChunks = [];
    for await (const chunk of xzStream) {
      xzChunks.push(chunk);
    }

    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
    await fs.promises.writeFile(destFile, Buffer.concat(xzChunks));
    // console.log(destFile);
  });

  it('should compress buffer', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceBuffer = fs.readFileSync(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
    // console.log('destFile', destFile);
    const destStream = fs.createWriteStream(destFile);
    const xzStream = new compressing.xz.FileStream({ source: sourceBuffer });
    pump(xzStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });

  });

  it('should compress stream', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
    // console.log('destFile', destFile);
    const destStream = fs.createWriteStream(destFile);
    const xzStream = new compressing.xz.FileStream({ source: sourceStream });
    pump(xzStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('should compress with custom level', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.xz');
    const xzStream = new compressing.xz.FileStream({
      source: sourceFile,
      level: 6,
    });
    const destStream = fs.createWriteStream(destFile);
    pump(xzStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('should emit error if sourceFile does not exit', done => {
    const sourceFile = 'file-not-exist';
    const xzStream = new compressing.xz.FileStream({ source: sourceFile });
    xzStream.on('error', err => {
      assert(err);
      done();
    });
  });

  it('should emit error if sourceStream emit error', done => {
    const sourceFile = 'file-not-exist';
    const sourceStream = fs.createReadStream(sourceFile);
    const xzStream = new compressing.xz.FileStream({ source: sourceStream });
    xzStream.on('error', err => {
      assert(err && err.code === 'ENOENT');
      done();
    });
  });

});
