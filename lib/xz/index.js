'use strict';

const utils = require('../utils');
const XzFileStream = require('./file_stream');
const XzUncompressStream = require('./uncompress_stream');

exports.FileStream = XzFileStream;
exports.UncompressStream = XzUncompressStream;
exports.compressFile = utils.makeFileProcessFn(XzFileStream);
exports.uncompress = utils.makeFileProcessFn(XzUncompressStream);
exports.decompress = utils.makeFileProcessFn(XzUncompressStream);