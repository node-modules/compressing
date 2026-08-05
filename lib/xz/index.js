'use strict';

const utils = require('../utils');
const XzCompressStream = require('./compress_stream');
const XzUncompressStream = require('./uncompress_stream');

exports.CompressStream = XzCompressStream;
exports.UncompressStream = XzUncompressStream;
exports.compressFile = utils.makeFileProcessFn(XzCompressStream);
exports.uncompress = utils.makeFileProcessFn(XzUncompressStream);
exports.decompress = utils.makeFileProcessFn(XzUncompressStream);
