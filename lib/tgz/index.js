'use strict';

const utils = require('../utils');
const TgzStream = require('./stream');
const TgzFileStream = require('./file_stream');

exports.Stream = TgzStream;
exports.FileStream = TgzFileStream;
exports.compressDir = utils.makeCompressDirFunc(TgzStream);
exports.compressFile = utils.makeCompressFileFunc(TgzFileStream);
