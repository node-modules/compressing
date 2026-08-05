'use strict';

const fs = require('fs');
const path = require('path');
const { pipeline: pump } = require('stream');

// Matches the kernel's own symlink chain limit closely enough to reject loops
// that realpath() never sees, without rejecting any realistic layout.
const MAX_SYMLINK_DEPTH = 32;

// Numeric flags are accepted here per the "File system flags" section of the fs
// docs, the same way node:zip opens with O_NOFOLLOW. The flag makes open() fail
// with ELOOP when the final component is a symlink, so the write never resolves
// one. It is undefined on Windows, where unlinkSymlink() below does the work.
const NO_FOLLOW_WRITE_FLAGS = typeof fs.constants.O_NOFOLLOW === 'number'
  ? fs.constants.O_NOFOLLOW | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_WRONLY
  : 'w';

/**
 * Remove a symlink sitting at the exact path an entry is about to be written to.
 * Extraction replaces such a link rather than writing through to whatever it
 * points at, which is how tar(1), node-tar and libarchive all behave.
 * @param {string} target - Absolute path of the entry destination
 */
async function unlinkSymlink(target) {
  try {
    const stat = await fs.promises.lstat(target);
    if (stat.isSymbolicLink()) await fs.promises.unlink(target);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

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
 * @param {number} depth - Recursion depth when re-walking a dangling symlink's target
 * @return {Promise<boolean>} true if safe, false if any segment escapes via symlink
 */
async function isRealPathSafe(targetPath, parentDir, realParentDir, depth = 0) {
  // realpath() rejects long chains with ELOOP, but the dangling branch below resolves
  // hop by hop without the kernel's help, so it needs its own bound.
  if (depth >= MAX_SYMLINK_DEPTH) return false;

  function isWithinParent(p) {
    return isPathWithinParent(p, parentDir) || isPathWithinParent(p, realParentDir);
  }

  // A link target may be written in either namespace when the two differ, as with
  // /var -> /private/var on macOS. Walk from whichever root actually contains it,
  // or the relative path below would climb out through '..' and reject a safe link.
  let baseDir;
  if (isPathWithinParent(targetPath, parentDir)) {
    baseDir = parentDir;
  } else if (isPathWithinParent(targetPath, realParentDir)) {
    baseDir = realParentDir;
  } else {
    return false;
  }

  const relative = path.relative(baseDir, targetPath);
  const segments = relative.split(path.sep);
  let current = baseDir;
  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    current = path.join(current, segment);
    try {
      const stat = await fs.promises.lstat(current);
      if (stat.isSymbolicLink()) {
        let resolved;
        try {
          resolved = await fs.promises.realpath(current);
        } catch (e) {
          if (e.code === 'ENOENT') {
            // Dangling symlink: realpath() gave up, so resolve the textual target
            // ourselves. Checking the target string alone is not enough, because the
            // target may itself be a symlink, or sit under a directory that is one,
            // and both get resolved when the entry is actually written.
            const linkTarget = await fs.promises.readlink(current);
            const absTarget = path.resolve(path.dirname(current), linkTarget);
            if (!isWithinParent(absTarget)) return false;
            return await isRealPathSafe(absTarget, parentDir, realParentDir, depth + 1);
          }
          // Fail closed: unexpected errors during symlink resolution are unsafe
          return false;
        }
        if (!isWithinParent(resolved)) {
          return false;
        }
        current = resolved;
      }
    } catch (e) {
      if (e.code === 'ENOENT') break; // Path doesn't exist yet, safe
      // Fail closed: unexpected filesystem errors are unsafe
      return false;
    }
  }
  return true;
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

    const strip = opts.strip ? Number(opts.strip) : 0;
    // Strip is handled here in makeUncompressFn, so remove it from opts to avoid passing to UncompressStream
    delete opts.strip;

    return new Promise((resolve, reject) => {
      fs.mkdir(destDir, { recursive: true }, err => {
        if (err) return reject(err);

        // Resolve destDir to absolute path for security validation
        const resolvedDestDir = path.resolve(destDir);
        // Resolve once for the entire extraction to handle OS-level symlinks
        // (e.g. /var -> /private/var on macOS)
        const realDestDirPromise = fs.promises.realpath(resolvedDestDir).catch(() => resolvedDestDir);

        let entryCount = 0;
        let successCount = 0;
        let isFinish = false;
        function done() {
          // resolve when both stream finish and file write finish
          if (isFinish && entryCount === successCount) resolve();
        }

        async function processEntry(header, stream) {
          const destFilePath = path.join(resolvedDestDir, stripFileName(strip, header.name, header.type));
          const resolvedDestPath = path.resolve(destFilePath);

          if (!isPathWithinParent(resolvedDestPath, resolvedDestDir)) {
            console.warn(`[compressing] Skipping entry with path traversal: "${header.name}" -> "${resolvedDestPath}"`);
            stream.resume();
            return;
          }

          const realDestDir = await realDestDirPromise;
          if (!await isRealPathSafe(resolvedDestPath, resolvedDestDir, realDestDir)) {
            console.warn(`[compressing] Skipping entry "${header.name}": a symlink in its path resolves outside the extraction directory`);
            stream.resume();
            return;
          }

          if (header.type === 'file') {
            const dir = path.dirname(destFilePath);
            await fs.promises.mkdir(dir, { recursive: true });
            await unlinkSymlink(destFilePath);
            entryCount++;
            pump(stream, fs.createWriteStream(destFilePath, {
              flags: NO_FOLLOW_WRITE_FLAGS,
              mode: opts.mode || header.mode,
            }), err => {
              if (err) return reject(err);
              successCount++;
              done();
            });
          } else if (header.type === 'symlink') {
            const dir = path.dirname(destFilePath);
            const target = path.resolve(dir, header.linkname);

            if (!isPathWithinParent(target, resolvedDestDir)) {
              console.warn(`[compressing] Skipping symlink "${header.name}": target "${target}" escapes extraction directory`);
              stream.resume();
              return;
            }

            if (!await isRealPathSafe(target, resolvedDestDir, realDestDir)) {
              console.warn(`[compressing] Skipping symlink "${header.name}": target resolves outside extraction directory via existing symlink`);
              stream.resume();
              return;
            }

            entryCount++;
            await fs.promises.mkdir(dir, { recursive: true });
            const relativeTarget = path.relative(dir, target);
            await fs.promises.symlink(relativeTarget, destFilePath);
            successCount++;
            stream.resume();
          } else { // directory
            await fs.promises.mkdir(destFilePath, { recursive: true });
            stream.resume();
          }
        }

        new StreamClass(opts)
          .on('finish', () => {
            isFinish = true;
            done();
          })
          .on('error', reject)
          .on('entry', (header, stream, next) => {
            stream.on('end', next);
            processEntry(header, stream).catch(reject);
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
