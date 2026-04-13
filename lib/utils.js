'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const pump = require('pump');

/**
 * Check if childPath is within parentPath (prevents path traversal attacks)
 * @param {string} childPath - The path to check
 * @param {string} parentPath - The parent directory path
 * @returns {boolean} - True if childPath is within parentPath
 */
function isPathWithinParent(childPath, parentPath) {
  const normalizedChild = path.resolve(childPath);
  const normalizedParent = path.resolve(parentPath);
  const parentWithSep = normalizedParent.endsWith(path.sep)
    ? normalizedParent
    : normalizedParent + path.sep;
  return normalizedChild === normalizedParent ||
         normalizedChild.startsWith(parentWithSep);
}

/**
 * Check if the real filesystem path stays within parentDir,
 * accounting for pre-existing symlinks on disk.
 * Walks each path segment from parentDir to targetPath using lstat.
 * If any segment is a symlink, resolves it and verifies it stays within parentDir.
 * @param {string} targetPath - Absolute path to validate
 * @param {string} parentDir - Absolute path of the extraction root
 * @param {string} realParentDir - Pre-resolved real path of parentDir (handles OS-level symlinks like /var -> /private/var on macOS)
 * @param {function} callback - callback(err, safe)
 */
function isRealPathSafe(targetPath, parentDir, realParentDir, callback) {
  function isWithinParent(p) {
    return isPathWithinParent(p, parentDir) || isPathWithinParent(p, realParentDir);
  }

  var relative = path.relative(parentDir, targetPath);
  var segments = relative.split(path.sep);
  var i = 0;
  var current = parentDir;

  function checkNext() {
    if (i >= segments.length) return callback(null, true);
    var segment = segments[i++];
    if (!segment || segment === '.') return checkNext();

    current = path.join(current, segment);
    fs.lstat(current, function(err, stat) {
      if (err) {
        if (err.code === 'ENOENT') return callback(null, true); // doesn't exist yet, safe
        // Fail closed: unexpected filesystem errors are unsafe
        return callback(null, false);
      }
      if (!stat.isSymbolicLink()) return checkNext();

      fs.realpath(current, function(err, resolved) {
        if (err) {
          if (err.code === 'ENOENT') {
            // Dangling symlink - check textual target
            return fs.readlink(current, function(err, linkTarget) {
              if (err) return callback(null, false);
              var absTarget = path.resolve(path.dirname(current), linkTarget);
              callback(null, isWithinParent(absTarget));
            });
          }
          // Fail closed: unexpected errors during symlink resolution are unsafe
          return callback(null, false);
        }
        if (!isWithinParent(resolved)) return callback(null, false);
        current = resolved;
        checkNext();
      });
    });
  }

  checkNext();
}

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
    if (!source) { // !source 和 sourceType中返回undeined对应
      const error = new Error('Type is not supported, must be a file path, file buffer, or a readable stream');
      error.name = 'IlligalSourceError';
      throw error;
    }
    if (destType(destDir) !== 'path') {
      const error = new Error('uncompress destination must be a directory');
      error.name = 'IlligalDestError';
      throw error;
    }

    return new Promise((resolve, reject) => {
      mkdirp(destDir, err => {
        if (err) return reject(err);

        // Resolve destDir to absolute path for security validation
        const resolvedDestDir = path.resolve(destDir);

        // Resolve once for the entire extraction to handle OS-level symlinks
        // (e.g. /var -> /private/var on macOS)
        let realDestDir = resolvedDestDir;
        fs.realpath(resolvedDestDir, (err, resolved) => {
          if (!err) realDestDir = resolved;

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
              const destFilePath = path.join(resolvedDestDir, header.name);
              const resolvedDestPath = path.resolve(destFilePath);

              // Security: Validate that the entry path doesn't escape the destination directory
              if (!isPathWithinParent(resolvedDestPath, resolvedDestDir)) {
                console.warn('[compressing] Skipping entry with path traversal: "' + header.name + '" -> "' + resolvedDestPath + '"');
                stream.resume();
                return;
              }

              // Security: Validate no pre-existing symlink in the path escapes the extraction directory
              isRealPathSafe(resolvedDestPath, resolvedDestDir, realDestDir, (err, safe) => {
                if (err || !safe) {
                  console.warn('[compressing] Skipping entry "' + header.name + '": a symlink in its path resolves outside the extraction directory');
                  stream.resume();
                  return;
                }

                if (header.type === 'file') {
                  const dir = path.dirname(destFilePath);
                  mkdirp(dir, err => {
                    if (err) return reject(err);

                    entryCount++;
                    pump(stream, fs.createWriteStream(destFilePath, { mode: opts.mode || header.mode }), err => {
                      if (err) return reject(err);
                      successCount++;
                      done();
                    });
                  });
                } else if (header.type === 'symlink') {
                  const dir = path.dirname(destFilePath);
                  const target = path.resolve(dir, header.linkname);

                  // Security: Validate that the symlink target doesn't escape the destination directory
                  if (!isPathWithinParent(target, resolvedDestDir)) {
                    console.warn('[compressing] Skipping symlink "' + header.name + '": target "' + target + '" escapes extraction directory');
                    stream.resume();
                    return;
                  }

                  // Security: Validate no pre-existing symlink in the target path escapes the extraction directory
                  isRealPathSafe(target, resolvedDestDir, realDestDir, (err, targetSafe) => {
                    if (err || !targetSafe) {
                      console.warn('[compressing] Skipping symlink "' + header.name + '": target resolves outside extraction directory via existing symlink');
                      stream.resume();
                      return;
                    }

                    entryCount++;

                    mkdirp(dir, err => {
                      if (err) return reject(err);

                      const relativeTarget = path.relative(dir, target);
                      fs.symlink(relativeTarget, destFilePath, err => {
                        if (err) return reject(err);
                        successCount++;
                        stream.resume();
                      });
                    });
                  });
                } else { // directory
                  mkdirp(destFilePath, err => {
                    if (err) return reject(err);
                    stream.resume();
                  });
                }
              });
            });
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
    pump(streams[0], streams[1], err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

exports.safePipe = safePipe;

function normalizePath(fileName) {
  fileName = path.normalize(fileName);
  // https://nodejs.org/api/path.html#path_path_normalize_path
  if (process.platform === 'win32') fileName = fileName.replace(/\\+/g, '/');
  return fileName;
}

function stripFileName(strip, fileName, type) {
  // before
  // node/package.json
  // node/lib/index.js
  //
  // when strip 1
  // package.json
  // lib/index.js
  //
  // when strip 2
  // package.json
  // index.js
  if (Buffer.isBuffer(fileName)) fileName = fileName.toString();

  // use / instead of \\
  if (fileName.indexOf('\\') !== -1) fileName = fileName.replace(/\\+/g, '/');

  // fix absolute path
  // /foo => foo
  if (fileName[0] === '/') fileName = fileName.replace(/^\/+/, '');

  // fix case
  // ./foo/bar => foo/bar
  if (fileName) {
    fileName = normalizePath(fileName);
  }

  let s = fileName.split('/');

  // fix relative path
  // foo/../bar/../../asdf/
  //  => asdf/
  if (s.indexOf('..') !== -1) {
    // replace '../' on ../../foo/bar
    fileName = fileName.replace(/(\.\.\/)+/, '');
    if (type === 'directory' && fileName && fileName[fileName.length - 1] !== '/') {
      fileName += '/';
    }
    s = fileName.split('/');
  }

  strip = Math.min(strip, s.length - 1);
  return s.slice(strip).join('/') || '/';
}

exports.stripFileName = stripFileName;
