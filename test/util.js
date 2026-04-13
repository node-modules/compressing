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

exports.pipelinePromise = pipelinePromise;
exports.createTarBuffer = createTarBuffer;
