'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('node:crypto');
const { pipeline: pump } = require('stream');
const compressing = require('../..');
const assert = require('assert');

describe('test/tgz/file_stream.test.js', () => {
  it('tgz.FileStream', done => {
    const sourceFile = path.join(__dirname, '..', 'fixtures', 'xx.log');
    const sourceStream = fs.createReadStream(sourceFile);
    const destFile = path.join(os.tmpdir(), randomUUID() + '.tgz');
    // console.log('dest', destFile);
    const fileStream = fs.createWriteStream(destFile);
    const tgzStream = new compressing.tgz.FileStream({ relativePath: 'dd/dd.log' });
    pump(sourceStream, tgzStream, fileStream, err => {
      console.log(err);
      assert(!err);
      assert(fs.existsSync(destFile));
      done();
    });
  });
});
