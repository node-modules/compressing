const stream = require('stream');

const pipelinePromise = stream.promises.pipeline;

module.exports = { pipelinePromise };
