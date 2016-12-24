'use strict';

const utils = require('../utils');
const TarStream = require('./stream');
const TarFileStream = require('./file_stream');

exports.Stream = TarStream;
exports.FileStream = TarFileStream;
exports.compressDir = utils.makeCompressDirFunc(TarStream);
exports.compressFile = utils.makeCompressFileFunc(TarFileStream);
