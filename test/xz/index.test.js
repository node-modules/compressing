'use strict';

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const compressing = require('../..');
const { xz } = compressing;

const rmtree = dir => {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      rmtree(p);
    } else {
      fs.unlinkSync(p);
    }
  }
  fs.rmdirSync(dir);
};

const compareFile = (file1, file2) => {
  const buf1 = fs.readFileSync(file1);
  const buf2 = fs.readFileSync(file2);
  return buf1.equals(buf2);
};

describe('test/xz/index.test.js', () => {
  const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
  const sourceFileBuf = fs.readFileSync(sourceFile);
  let destFile;
  let uncompressDestFile;
  let destDir;

  beforeEach(() => {
    destFile = path.join(__dirname, '..', 'fixtures', 'xx.log.xz');
    uncompressDestFile = path.join(__dirname, '..', 'fixtures', 'uncompress_xx.log');
    destDir = path.join(__dirname, '..', 'fixtures', 'uncompress_dir');
    if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
    if (fs.existsSync(uncompressDestFile)) fs.unlinkSync(uncompressDestFile);
    rmtree(destDir);
  });
  afterEach(() => {
    if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
    if (fs.existsSync(uncompressDestFile)) fs.unlinkSync(uncompressDestFile);
    rmtree(destDir);
  });

  it('should be a function', () => {
    assert(typeof xz.compressFile === 'function');
    assert(typeof xz.uncompress === 'function');
  });

  it('should compress file and uncompress file', async () => {
    await xz.compressFile(sourceFile, destFile);
    assert(fs.existsSync(destFile));
    await xz.uncompress(destFile, uncompressDestFile);
    assert(compareFile(sourceFile, uncompressDestFile));
  });

  it('should compress buffer and uncompress buffer', async () => {
    await xz.compressFile(sourceFileBuf, destFile);
    assert(fs.existsSync(destFile));
    const destFileBuf = fs.readFileSync(destFile);
    await xz.uncompress(destFileBuf, uncompressDestFile);
    assert(compareFile(sourceFile, uncompressDestFile));
  });

  it('should compress stream and uncompress stream', async () => {
    const sourceStream = fs.createReadStream(sourceFile);
    await xz.compressFile(sourceStream, destFile);
    assert(fs.existsSync(destFile));
    const destStream = fs.createReadStream(destFile);
    await xz.uncompress(destStream, uncompressDestFile);
    assert(compareFile(sourceFile, uncompressDestFile));
  });

  it('should compress with promise', done => {
    xz.compressFile(sourceFile, destFile)
      .then(() => {
        assert(fs.existsSync(destFile));
        return xz.uncompress(destFile, uncompressDestFile);
      })
      .then(() => {
        assert(compareFile(sourceFile, uncompressDestFile));
        done();
      })
      .catch(done);
  });

  it('should compress and uncompress in stream way', done => {
    const sourceStream = fs.createReadStream(sourceFile);
    const compressStream = new xz.CompressStream();
    const uncompressStream = new xz.UncompressStream();

    sourceStream.pipe(compressStream).pipe(uncompressStream);

    const chunks = [];
    uncompressStream.on('data', chunk => chunks.push(chunk));
    uncompressStream.on('end', () => {
      const buf = Buffer.concat(chunks);
      assert(sourceFileBuf.equals(buf));
      done();
    });
    uncompressStream.on('error', done);
  });
});
