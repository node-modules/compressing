const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const pump = require('pump');
const compressing = require('../..');
const assert = require('assert');

describe('test/gzip/file_stream.test.js', () => {
  it('should be a transform stream', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
    console.log('destFile', destFile);
    const gzipStream = new compressing.gzip.FileStream();
    const destStream = fs.createWriteStream(destFile);
    pump(sourceStream, gzipStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('should compress according to file path', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
    console.log('destFile', destFile);
    const gzipStream = new compressing.gzip.FileStream({ source: sourceFile });
    const destStream = fs.createWriteStream(destFile);
    pump(gzipStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('should compress file into Buffer', async () => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const gzipStream = new compressing.gzip.FileStream({ source: sourceFile });
    const gzipChunks = [];
    for await (const chunk of gzipStream) {
      gzipChunks.push(chunk);
    }

    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
    await fs.promises.writeFile(destFile, Buffer.concat(gzipChunks));
    console.log(destFile);
  });

  it('should compress buffer', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceBuffer = fs.readFileSync(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
    console.log('destFile', destFile);
    const destStream = fs.createWriteStream(destFile);
    const gzipStream = new compressing.gzip.FileStream({ source: sourceBuffer });
    pump(gzipStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });

  });

  it('should compress stream', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log.gz');
    console.log('destFile', destFile);
    const destStream = fs.createWriteStream(destFile);
    const gzipStream = new compressing.gzip.FileStream({ source: sourceStream });
    pump(gzipStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('should emit error if sourceFile does not exit', done => {
    const sourceFile = 'file-not-exist';
    const gzipStream = new compressing.gzip.FileStream({ source: sourceFile });
    gzipStream.on('error', err => {
      assert(err);
      done();
    });
  });

  it('should emit error if sourceStream emit error', done => {
    const sourceFile = 'file-not-exist';
    const sourceStream = fs.createReadStream(sourceFile);
    const gzipStream = new compressing.gzip.FileStream({ source: sourceStream });
    gzipStream.on('error', err => {
      assert(err && err.code === 'ENOENT');
      done();
    });
  });

});
