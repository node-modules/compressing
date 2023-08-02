'use strict';

const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const pump = require('pump');
const compressing = require('../..');
const assert = require('assert');
const TarStream = compressing.tar.Stream;


describe('test/tar/stream.test.js', () => {
  afterEach(mm.restore);

  it('.addEntry(file)', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const tarStream = new TarStream();
    tarStream.addEntry(path.join(__dirname, '..', 'fixtures', 'xx.log'));

    pump(tarStream, fileStream, err => {
      console.log('error', err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(file, { relativePath })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const tarStream = new TarStream();
    tarStream.addEntry(path.join(__dirname, '..', 'fixtures', 'xx.log'), { relativePath: 'dd/dd.log' });

    pump(tarStream, fileStream, err => {
      console.log('error', err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(dir)', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const tarStream = new TarStream();
    tarStream.addEntry(path.join(__dirname, '..', 'fixtures'));

    pump(tarStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(dir, { ignoreBase: true })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const tarStream = new TarStream();
    tarStream.addEntry(path.join(__dirname, '..', 'fixtures'), { ignoreBase: true });

    pump(tarStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(dir, { relativePath })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const tarStream = new TarStream();
    tarStream.addEntry(path.join(__dirname, '..', 'fixtures'), { relativePath: 'xxx' });

    pump(tarStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(dir, { relativePath, ignoreBase: true })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const tarStream = new TarStream();
    tarStream.addEntry(path.join(__dirname, '..', 'fixtures'), { relativePath: 'xxx', ignoreBase: true });

    pump(tarStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(buffer, { relativePath })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const tarStream = new TarStream();
    tarStream.addEntry(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'xx.log')), { relativePath: 'xx.log' });
    pump(tarStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(stream, { relativePath })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    mm(console, 'warn', msg => {
      assert(msg === 'You should specify the size of streamming data by opts.size to prevent all streaming data from loading into memory. If you are sure about memory cost, pass opts.suppressSizeWarning: true to suppress this warning');
    });

    const tarStream = new TarStream();
    tarStream.addEntry(fs.createReadStream(path.join(__dirname, '..', 'fixtures', 'xx.log')), { relativePath: 'xx.log' });
    pump(tarStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry(stream, { relativePath, size })', done => {
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    mm(console, 'warn', msg => {
      assert(!msg);
    });

    const tarStream = new TarStream();
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    tarStream.addEntry(fs.createReadStream(sourceFile), { relativePath: 'dd/xx.log', size: fs.statSync(sourceFile).size });
    pump(tarStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('.addEntry multiple times', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceDir = path.join(__dirname, '..', 'fixtures');
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    const fileStream = fs.createWriteStream(destFile);
    console.log('dest', destFile);

    const tarStream = new TarStream();

    // add stream
    tarStream.addEntry(fs.createReadStream(sourceFile), { relativePath: 'stream.log', size: fs.statSync(sourceFile).size });

    // add buffer
    tarStream.addEntry(fs.readFileSync(sourceFile), { relativePath: 'buffer/buffer.log' });

    // add file
    tarStream.addEntry(sourceFile, { relativePath: 'file/file/file.log' });

    // add dir
    tarStream.addEntry(sourceDir);

    pump(tarStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

});
