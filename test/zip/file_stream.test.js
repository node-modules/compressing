'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const pump = require('pump');
const compressing = require('../..');
const assert = require('power-assert');

describe('test/zip/file_stream.test.js', () => {
  it('zip.FileStream', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    const zipStream = new compressing.zip.FileStream({ relativePath: 'dd/dd.log' });
    pump(sourceStream, zipStream, fileStream, err => {
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });
});
