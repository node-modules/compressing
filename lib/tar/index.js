'use strict';

const utils = require('../utils');
const TarStream = require('./stream');
const TarFileStream = require('./file_stream');
const UncompressStream = require('./uncompress_stream');

exports.Stream = TarStream;
exports.FileStream = TarFileStream;
exports.UncompressStream = UncompressStream;
exports.compressDir = utils.makeCompressDirFunc(TarStream);
exports.compressFile = utils.makeCompressFileFunc(TarFileStream);
