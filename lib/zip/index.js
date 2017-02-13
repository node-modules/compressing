'use strict';

const utils = require('../utils');
const ZipStream = require('./stream');
const ZipFileStream = require('./file_stream');
const UncompressStream = require('./uncompress_stream');

exports.Stream = ZipStream;
exports.FileStream = ZipFileStream;
exports.UncompressStream = UncompressStream;
exports.compressDir = utils.makeCompressDirFunc(ZipStream);
exports.compressFile = utils.makeCompressFileFunc(ZipFileStream);
