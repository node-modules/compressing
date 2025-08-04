const stream = require('stream');
const { pipeline: pump } = require('stream');

// impl promise pipeline on Node.js 14
const pipelinePromise = stream.promises?.pipeline ?? function pipeline(...args) {
  return new Promise((resolve, reject) => {
    pump(...args, err => {
      if (err) return reject(err);
      resolve();
    });
  });
};

exports.pipelinePromise = pipelinePromise;
