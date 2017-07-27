'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const pipe = require('multipipe');

// file/fileBuffer/stream
exports.sourceType = source => {
  if (!source) return undefined;

  if (source instanceof Buffer) return 'buffer';
  if (typeof source._read === 'function' || typeof source._transform === 'function') return 'stream';
  if (typeof source !== 'string') {
    const err = new Error('Type is not supported, must be a file path, file buffer, or a readable stream');
    err.name = 'IlligalSourceError';
    throw err;
  }

  return 'file';
};

function destType(dest) {
  if (typeof dest._write === 'function' || typeof dest._transform === 'function') return 'stream';
  if (typeof dest !== 'string') {
    const err = new Error('Type is not supported, must be a file path, or a writable stream');
    err.name = 'IlligalDestinationError';
    throw err;
  }
  return 'path';
}

exports.destType = destType;

const illigalEntryError = new Error('Type is not supported, must be a file path, directory path, file buffer, or a readable stream');
illigalEntryError.name = 'IlligalEntryError';

// fileOrDir/fileBuffer/stream
exports.entryType = entry => {
  if (!entry) return;

  if (entry instanceof Buffer) return 'buffer';
  if (typeof entry._read === 'function' || typeof entry._transform === 'function') return 'stream';
  if (typeof entry !== 'string') throw illigalEntryError;

  return 'fileOrDir';
};


exports.clone = obj => {
  const newObj = {};
  for (const i in obj) {
    newObj[i] = obj[i];
  }
  return newObj;
};

exports.makeFileProcessFn = StreamClass => {
  return (source, dest, opts) => {
    opts = opts || {};
    opts.source = source;
    const destStream = destType(dest) === 'path' ? fs.createWriteStream(dest) : dest;
    const compressStream = new StreamClass(opts);
    return safePipe([ compressStream, destStream ]);
  };
};

exports.makeCompressDirFn = StreamClass => {
  return (dir, dest, opts) => {
    const destStream = destType(dest) === 'path' ? fs.createWriteStream(dest) : dest;
    const compressStream = new StreamClass();
    compressStream.addEntry(dir, opts);
    return safePipe([ compressStream, destStream ]);
  };
};

exports.makeUncompressFn = StreamClass => {
  return (source, destDir, opts) => {
    opts = opts || {};
    opts.source = source;
    if (destType(destDir) !== 'path') {
      const error = new Error('uncompress destination must be a directory');
      error.name = 'IlligalDestError';
      throw error;
    }

    return new Promise((resolve, reject) => {
      mkdirp(destDir, err => {
        if (err) return reject(err);

        let entryCount = 0;
        let successCount = 0;
        let isFinish = false;
        function done() {
          // resolve when both stream finish and file write finish
          if (isFinish && entryCount === successCount) resolve();
        }

        new StreamClass(opts)
          .on('finish', () => {
            isFinish = true;
            done();
          })
          .on('error', reject)
          .on('entry', (header, stream, next) => {
            stream.on('end', next);

            if (header.type === 'file') {
              const fullpath = path.join(destDir, header.name);
              mkdirp(path.dirname(fullpath), err => {
                if (err) return reject(err);

                entryCount++;
                stream.pipe(fs.createWriteStream(fullpath, { mode: header.mode }))
                  .on('finish', () => {
                    successCount++;
                    done();
                  });
              });
            } else { // directory
              mkdirp(path.join(destDir, header.name), err => {
                if (err) return reject(err);
                stream.resume();
              });
            }
          });
      });
    });
  };
};

exports.streamToBuffer = stream => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream
    .on('readable', () => {
      let chunk;
      while ((chunk = stream.read())) chunks.push(chunk);
    })
    .on('end', () => resolve(Buffer.concat(chunks)))
    .on('error', err => reject(err));
  });
};

function safePipe(streams) {
  return new Promise((resolve, reject) => {
    pipe(streams[0], streams[1], err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

exports.safePipe = safePipe;
