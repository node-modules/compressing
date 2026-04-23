const stream = require('stream');
const { createTarBuffer } = require('../lib/tar/archive');

const pipelinePromise = stream.promises.pipeline;

/**
 * Create a TAR buffer with given entries
 * @param {Array<{name: string, type?: string, linkname?: string, content?: string}>} entries
 * @returns {Promise<Buffer>}
 */
function createTarBufferForTests(entries) {
  return Promise.resolve(createTarBuffer(entries.map(entry => ({
    name: entry.name,
    type: entry.type,
    linkname: entry.linkname,
    data: entry.content || '',
  }))));
}

module.exports = { pipelinePromise, createTarBuffer: createTarBufferForTests };
