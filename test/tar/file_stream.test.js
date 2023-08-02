'use strict';

const mm = require('mm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const assert = require('assert');
const pump = require('pump');
const compressing = require('../..');

describe('test/tar/file_stream.test.js', () => {
  afterEach(mm.restore);
  it('tar.FileStream without size', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    console.log('dest', destFile);

    mm(console, 'warn', msg => {
      assert(msg === 'You should specify the size of streamming data by opts.size to prevent all streaming data from loading into memory. If you are sure about memory cost, pass opts.suppressSizeWarning: true to suppress this warning');
    });

    const fileStream = fs.createWriteStream(destFile);
    const tarStream = new compressing.tar.FileStream({ relativePath: 'xx.log' });
    pump(sourceStream, tarStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });

  it('tar.FileStream with size', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.tar');
    console.log('dest', destFile);

    mm(console, 'warn', msg => {
      assert(!msg);
    });

    const fileStream = fs.createWriteStream(destFile);
    const tarStream = new compressing.tar.FileStream({ relativePath: 'xx.log', size: fs.statSync(sourceFile).size });
    pump(sourceStream, tarStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });
});
