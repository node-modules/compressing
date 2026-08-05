const stream = require('stream');
const pump = require('pump');
const tar = require('tar-stream');

// impl promise pipeline on Node.js 14
const pipelinePromise = stream.promises?.pipeline ?? function pipeline(...args) {
  return new Promise((resolve, reject) => {
    pump(...args, err => {
      if (err) return reject(err);
      resolve();
    });
  });
};

/**
 * Create a TAR buffer with given entries
 * @param {Array<{name: string, type?: string, linkname?: string, content?: string}>} entries
 * @returns {Promise<Buffer>}
 */
function createTarBuffer(entries) {
  return new Promise((resolve, reject) => {
    const pack = tar.pack();
    const chunks = [];

    pack.on('data', chunk => chunks.push(chunk));
    pack.on('end', () => resolve(Buffer.concat(chunks)));
    pack.on('error', reject);

    for (const entry of entries) {
      if (entry.type === 'symlink') {
        pack.entry({ name: entry.name, type: 'symlink', linkname: entry.linkname });
      } else if (entry.type === 'directory') {
        pack.entry({ name: entry.name, type: 'directory' });
      } else {
        pack.entry({ name: entry.name, type: 'file' }, entry.content || '');
      }
    }

    pack.finalize();
  });
}

/**
 * Create a ZIP buffer with given file entries
 * @param {Array<{name: string, content?: string}>} entries - Files to put in the archive
 * @returns {Promise<Buffer>} The archive contents
 */
function createZipBuffer(entries) {
  return new Promise((resolve, reject) => {
    // An empty archive never finalizes, so the promise would never settle.
    if (!entries || entries.length === 0) {
      return reject(new Error('createZipBuffer requires at least one entry'));
    }

    const compressing = require('..');
    const zipStream = new compressing.zip.Stream();
    const chunks = [];

    // Listeners first, so an entry rejected during addEntry() settles the promise.
    zipStream.on('data', chunk => chunks.push(chunk));
    zipStream.on('end', () => resolve(Buffer.concat(chunks)));
    zipStream.on('error', reject);

    for (const entry of entries) {
      zipStream.addEntry(Buffer.from(entry.content || ''), { relativePath: entry.name });
    }
  });
}

exports.pipelinePromise = pipelinePromise;
exports.createZipBuffer = createZipBuffer;
exports.createTarBuffer = createTarBuffer;
