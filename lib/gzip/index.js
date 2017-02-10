'use strict';

const utils = require('../utils');
const GzipFileStream = require('./file_stream');
const GzipUncompressStream = require('./uncompress_stream');

exports.FileStream = GzipFileStream;
exports.UncompressStream = GzipUncompressStream;
exports.compressFile = utils.makeCompressFileFunc(GzipFileStream);
