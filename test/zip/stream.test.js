'use strict';

const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const pipe = require('multipipe');
const compressible = require('../..');
const assert = require('power-assert');
const ZipStream = compressible.zip.Stream;

describe('test/zip/stream.test.js', () => {
  afterEach(mm.restore);

  it('.addEntry(file)', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const zipStream = new ZipStream();
    zipStream.addEntry(path.join(__dirname, '..', 'fixtures', 'xx.log'));

    pipe(zipStream, fileStream, err => {
      console.log('error', err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(file, { relativePath })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const zipStream = new ZipStream();
    zipStream.addEntry(path.join(__dirname, '..', 'fixtures', 'xx.log'), { relativePath: 'dd/dd.log' });

    pipe(zipStream, fileStream, err => {
      console.log('error', err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(dir)', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const zipStream = new ZipStream();
    zipStream.addEntry(path.join(__dirname, '..', 'fixtures'));

    pipe(zipStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(dir, { ignoreBase: true })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const zipStream = new ZipStream();
    zipStream.addEntry(path.join(__dirname, '..', 'fixtures'), { ignoreBase: true });

    pipe(zipStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(dir, { relativePath })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const zipStream = new ZipStream();
    zipStream.addEntry(path.join(__dirname, '..', 'fixtures'), { relativePath: 'xxx' });

    pipe(zipStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(dir, { relativePath, ignoreBase: true })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const zipStream = new ZipStream();
    zipStream.addEntry(path.join(__dirname, '..', 'fixtures'), { relativePath: 'xxx', ignoreBase: true });

    pipe(zipStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(buffer, { relativePath })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const zipStream = new ZipStream();
    zipStream.addEntry(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xx.log')), { relativePath: 'xx.log' });
    pipe(zipStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(stream, { relativePath })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    mm(console, 'warn', msg => {
      assert(msg === 'You should specify the size of streamming data by opts.size to prevent all streaming data from loading into memory. If you are sure about memory cost, pass opts.supressSizeWarning: true to suppress this warning');
    });

    const zipStream = new ZipStream();
    zipStream.addEntry(fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xx.log')), { relativePath: 'xx.log' });
    pipe(zipStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(stream, { relativePath, size })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    mm(console, 'warn', msg => {
      assert(!msg);
    });

    const zipStream = new ZipStream();
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    zipStream.addEntry(fs.createReadStream(sourceFile), { relativePath: 'dd/xx.log', size: fs.statSync(sourceFile).size });
    pipe(zipStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry multiple times', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceDir = path.join(__dirname, '..', 'fixtures');
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const zipStream = new ZipStream();

    // add stream
    zipStream.addEntry(fs.createReadStream(sourceFile), { relativePath: 'stream.log', size: fs.statSync(sourceFile).size });

    // add buffer
    zipStream.addEntry(fs.readFileSync(sourceFile), { relativePath: 'buffer/buffer.log' });

    // add file
    zipStream.addEntry(sourceFile, { relativePath: 'file/file/file.log' });

    // add dir
    zipStream.addEntry(sourceDir);

    pipe(zipStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

});
