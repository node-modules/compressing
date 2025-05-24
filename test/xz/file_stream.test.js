const fs = require('fs');
const path = require('path');
const assert = require('assert');
const compressing = require('../..');

describe('test/xz/file_stream.test.js', () => {
  const sourceFile = path.join(__dirname, '../fixtures/xx.log');
  const xzFile = path.join(__dirname, '../fixtures/xx.log.xz');

  it('should compress file to xz', done => {
    const dest = path.join(__dirname, '../fixtures/xx.log.xz.tmp');
    compressing.xz.compressFile(sourceFile, dest)
      .then(() => {
        assert(fs.existsSync(dest));
        // 文件大小应该小于原始文件
        assert(fs.statSync(dest).size < fs.statSync(sourceFile).size);
        fs.unlinkSync(dest);
        done();
      })
      .catch(done);
  });

  it('should decompress xz file to log', done => {
    const dest = path.join(__dirname, '../fixtures/xx.log.tmp');
    compressing.xz.uncompress(xzFile, dest)
      .then(() => {
        assert(fs.existsSync(dest));
        // 内容应该一致
        const raw = fs.readFileSync(sourceFile);
        const out = fs.readFileSync(dest);
        assert(raw.equals(out));
        fs.unlinkSync(dest);
        done();
      })
      .catch(done);
  });

  it('should compress buffer to xz', done => {
    const buf = fs.readFileSync(sourceFile);
    const dest = path.join(__dirname, '../fixtures/xx.log.xz.tmp');
    compressing.xz.compressFile(buf, dest)
      .then(() => {
        assert(fs.existsSync(dest));
        fs.unlinkSync(dest);
        done();
      })
      .catch(done);
  });

  it('should decompress xz buffer to log', done => {
    const buf = fs.readFileSync(xzFile);
    const dest = path.join(__dirname, '../fixtures/xx.log.tmp');
    compressing.xz.uncompress(buf, dest)
      .then(() => {
        assert(fs.existsSync(dest));
        const raw = fs.readFileSync(sourceFile);
        const out = fs.readFileSync(dest);
        assert(raw.equals(out));
        fs.unlinkSync(dest);
        done();
      })
      .catch(done);
  });

  it('should compress stream to xz', done => {
    const src = fs.createReadStream(sourceFile);
    const dest = path.join(__dirname, '../fixtures/xx.log.xz.tmp');
    compressing.xz.compressFile(src, dest)
      .then(() => {
        assert(fs.existsSync(dest));
        fs.unlinkSync(dest);
        done();
      })
      .catch(done);
  });

  it('should decompress xz stream to log', done => {
    const src = fs.createReadStream(xzFile);
    const dest = path.join(__dirname, '../fixtures/xx.log.tmp');
    compressing.xz.uncompress(src, dest)
      .then(() => {
        assert(fs.existsSync(dest));
        const raw = fs.readFileSync(sourceFile);
        const out = fs.readFileSync(dest);
        assert(raw.equals(out));
        fs.unlinkSync(dest);
        done();
      })
      .catch(done);
  });
}); 
