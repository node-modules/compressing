'use strict';

const path = require('path');
const coffee = require('coffee');

describe('test/ts.test.js', async () => {
  const tsconfigPath = path.resolve(__dirname, './fixtures/types/tsconfig.json');

  it('should compile ts without error', async () => {
    await coffee.fork(require.resolve('typescript/bin/tsc'), [ '-p', tsconfigPath ])
      .debug()
      .expect('code', 0)
      .end();
  });
});
