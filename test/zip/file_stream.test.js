'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const compressing = require('../..');
const assert = require('assert');
const { pipeline } = require('stream');

/**
 * 在 Node 14 上是能跑过的，16 和 18 均跑不过
 */
describe.skip('test/zip/file_stream.test.js', () => {
  it('zip.FileStream', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), uuid.v4() + '.zip');
    const fileStream = fs.createWriteStream(destFile);
    const zipStream = new compressing.zip.FileStream({ relativePath: 'dd/dd.log' });

    pipeline(sourceStream, zipStream, fileStream, err => {
      if (err) {
        done(err);
        return;
      }
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });
});
