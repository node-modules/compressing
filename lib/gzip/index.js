'use strict';

const utils = require('../utils');
const GzipFileStream = require('./file_stream');

exports.FileStream = GzipFileStream;
exports.compressFile = utils.makeCompressFileFunc(GzipFileStream);
