'use strict';

const utils = require('../utils');

let XzFileStream;
let XzUncompressStream;

function checkDependency() {
  try {
    require('lzma-native');
    return true;
  } catch (err) {
    return false;
  }
}

function throwIfNoDependency() {
  if (!checkDependency()) {
    throw new Error('lzma-native is required for xz compression/decompression. Please install it with: npm install lzma-native');
  }
}

// Lazy load the implementation
function getImplementation() {
  if (!XzFileStream) {
    throwIfNoDependency();
    XzFileStream = require('./file_stream');
    XzUncompressStream = require('./uncompress_stream');
  }
  return { XzFileStream, XzUncompressStream };
}

exports.FileStream = function(opts) {
  const { XzFileStream } = getImplementation();
  return new XzFileStream(opts);
};

exports.UncompressStream = function(opts) {
  const { XzUncompressStream } = getImplementation();
  return new XzUncompressStream(opts);
};

exports.compressFile = function(source, dest, opts) {
  throwIfNoDependency();
  const { XzFileStream } = getImplementation();
  return utils.makeFileProcessFn(XzFileStream)(source, dest, opts);
};

exports.uncompress = function(source, dest, opts) {
  throwIfNoDependency();
  const { XzUncompressStream } = getImplementation();
  return utils.makeFileProcessFn(XzUncompressStream)(source, dest, opts);
};

exports.decompress = exports.uncompress;
