'use strict';

const assert = require('assert');
const utils = require('../lib/utils');

describe('test/utils.test.js', () => {
  describe('utils.sourceType()', () => {
    it('should throw error', () => {
      let err;
      try {
        utils.sourceType({});
      } catch (e) {
        err = e;
      }
      assert(err);
    });
  });

  describe('utils.destType()', () => {
    it('should throw error', () => {
      let err;
      try {
        utils.destType(() => {});
      } catch (e) {
        err = e;
      }
      assert(err);
    });
  });
});
