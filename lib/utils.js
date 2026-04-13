'use strict';

const fs = require('fs');
const path = require('path');
const { pipeline: pump } = require('stream');

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
 * @returns {Promise<boolean>} true if safe, false if any segment escapes via symlink
 */
async function isRealPathSafe(targetPath, parentDir, realParentDir) {
  function isWithinParent(p) {
    return isPathWithinParent(p, parentDir) || isPathWithinParent(p, realParentDir);
  }

  const relative = path.relative(parentDir, targetPath);
  const segments = relative.split(path.sep);
  let current = parentDir;
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
            // Dangling symlink - check textual target
            const linkTarget = await fs.promises.readlink(current);
            const absTarget = path.resolve(path.dirname(current), linkTarget);
            return isWithinParent(absTarget);
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
            entryCount++;
            pump(stream, fs.createWriteStream(destFilePath, { mode: opts.mode || header.mode }), err => {
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
