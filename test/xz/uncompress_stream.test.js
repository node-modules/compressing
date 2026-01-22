const fs = require('fs');
const mm = require('mm');
const os = require('os');
const uuid = require('uuid');
const path = require('path');
const assert = require('assert');
const { pipeline: pump } = require('stream');
const streamifier = require('streamifier');
const compressing = require('../..');

const originalFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
const isWindows = os.platform() === 'win32';

// Helper function to create XZ compressed file for testing
function createXzFile() {
  const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
  const destFile = path.join(os.tmpdir(), 'test-xx.log.xz');

  return new Promise((resolve, reject) => {
    const sourceStream = fs.createReadStream(sourceFile);
    const xzStream = new compressing.xz.FileStream();
    const destStream = fs.createWriteStream(destFile);

    pump(sourceStream, xzStream, destStream, err => {
      if (err) reject(err);
      else resolve(destFile);
    });
  });
}

describe('test/xz/uncompress_stream.test.js', () => {
  let sourceFile;

  before(async () => {
    sourceFile = await createXzFile();
  });

  afterEach(mm.restore);

  it('should be transform stream', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');

    const sourceStream = fs.createReadStream(sourceFile);
    const uncompressStream = new compressing.xz.UncompressStream();
    const destStream = fs.createWriteStream(destFile);
    pump(sourceStream, uncompressStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      const originalFileBuffer = fs.readFileSync(originalFile);
      const destFileBuffer = fs.readFileSync(destFile);
      assert.equal(destFileBuffer.length, originalFileBuffer.length);
      if (!isWindows) {
        // EOL not equal to linux
        assert.equal(destFileBuffer.toString('utf8'), originalFileBuffer.toString('utf8'));
      }
      done();
    });
  });

  it('should uncompress according to file path', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');

    const uncompressStream = new compressing.xz.UncompressStream({ source: sourceFile });
    const destStream = fs.createWriteStream(destFile);
    pump(uncompressStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      const originalFileBuffer = fs.readFileSync(originalFile);
      const destFileBuffer = fs.readFileSync(destFile);
      assert.equal(destFileBuffer.length, originalFileBuffer.length);
      if (!isWindows) {
        assert.equal(destFileBuffer.toString('utf8'), originalFileBuffer.toString('utf8'));
      }
      done();
    });
  });

  it('should uncompress buffer', done => {
    const sourceBuffer = fs.readFileSync(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');

    const destStream = fs.createWriteStream(destFile);
    const uncompressStream = new compressing.xz.UncompressStream({ source: sourceBuffer });
    pump(uncompressStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      const originalFileBuffer = fs.readFileSync(originalFile);
      const destFileBuffer = fs.readFileSync(destFile);
      assert.equal(destFileBuffer.length, originalFileBuffer.length);
      if (!isWindows) {
        assert.equal(destFileBuffer.toString('utf8'), originalFileBuffer.toString('utf8'));
      }
      done();
    });
  });

  it('should uncompress stream', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.log');

    const destStream = fs.createWriteStream(destFile);
    const uncompressStream = new compressing.xz.UncompressStream({ source: sourceStream });
    pump(uncompressStream, destStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      const originalFileBuffer = fs.readFileSync(originalFile);
      const destFileBuffer = fs.readFileSync(destFile);
      assert.equal(destFileBuffer.length, originalFileBuffer.length);
      if (!isWindows) {
        assert.equal(destFileBuffer.toString('utf8'), originalFileBuffer.toString('utf8'));
      }
      done();
    });
  });

  it('should emit error if sourceFile does not exit', done => {
    const sourceFile = 'file-not-exist';
    const uncompressStream = new compressing.xz.UncompressStream({ source: sourceFile });
    uncompressStream.on('error', err => {
      assert(err);
      done();
    });
  });

  it('should emit error if sourceStream emit error', done => {
    const sourceFile = 'file-not-exist';
    const sourceStream = fs.createReadStream(sourceFile);
    const uncompressStream = new compressing.xz.UncompressStream({ source: sourceStream });
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
    const uncompressStream = new compressing.xz.UncompressStream({ source: sourceBuffer });
    uncompressStream.on('error', err => {
      assert(err === 'mockError');
      done();
    });
  });

});
