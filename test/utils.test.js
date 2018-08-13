'use strict';

const assert = require('assert');
const utils = require('../lib/utils');

describe('test/utils.test.js', () => {
  describe('.sourceType()', () => {
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

  describe('.destType()', () => {
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

  describe('.stripFileName()', () => {
    it('should handle absolute path', () => {
      assert(utils.stripFileName(0, '/', 'directory') === '/');
      assert(utils.stripFileName(0, Buffer.from('/'), 'directory') === '/');
      assert(utils.stripFileName(0, '/foo/', 'directory') === 'foo/');
      assert(utils.stripFileName(0, '/foo/bar/', 'directory') === 'foo/bar/');
      assert(utils.stripFileName(0, '/////foo/', 'directory') === 'foo/');

      assert(utils.stripFileName(0, '/foo.txt', 'file') === 'foo.txt');
      assert(utils.stripFileName(0, '///foo', 'file') === 'foo');
    });

    it('should handle relative path', () => {
      assert(utils.stripFileName(0, 'foo/../bar/../../asdf/', 'directory') === 'asdf/');
      assert(utils.stripFileName(0, '../../../../foo/', 'directory') === 'foo/');
      assert(utils.stripFileName(0, '../../../foo/', 'directory') === 'foo/');
      assert(utils.stripFileName(0, 'home/../../../../../foo', 'directory') === 'foo/');
      assert(utils.stripFileName(0, '../../../../foo/../../../../', 'directory') === '/');
      assert(utils.stripFileName(0, '/ok/../../../../../foo/bar/', 'directory') === 'foo/bar/');
      assert(utils.stripFileName(0, '/////foo/../../../../foo/', 'directory') === 'foo/');

      assert(utils.stripFileName(0, '/home/../../../foo.txt', 'file') === 'foo.txt');
      assert(utils.stripFileName(0, '///../../../../foo', 'file') === 'foo');
      assert(utils.stripFileName(0, '../../../../etc/hosts', 'file') === 'etc/hosts');
    });

    it('should replace \\', () => {
      assert(utils.stripFileName(0, '\\', 'directory') === '/');
      assert(utils.stripFileName(0, '/foo\\', 'directory') === 'foo/');
      assert(utils.stripFileName(0, '/foo\\\\\\bar/', 'directory') === 'foo/bar/');
      assert(utils.stripFileName(0, '//\\\\\\\\///foo/', 'directory') === 'foo/');

      assert(utils.stripFileName(0, '\\foo.txt', 'file') === 'foo.txt');
      assert(utils.stripFileName(0, '\\1\\2\\3\\4\\foo.txt', 'file') === '1/2/3/4/foo.txt');
      assert(utils.stripFileName(0, '///\\\\\\foo', 'file') === 'foo');
    });

    it('should strip work', () => {
      assert(utils.stripFileName(0, '/ok/../../../../../foo/bar/', 'directory') === 'foo/bar/');
      assert(utils.stripFileName(1, '/ok/../../../../../foo/bar/', 'directory') === 'bar/');
      assert(utils.stripFileName(2, '/ok/../../../../../foo/bar/', 'directory') === '/');

      assert(utils.stripFileName(0, '\\1\\2\\3\\4\\foo.txt', 'file') === '1/2/3/4/foo.txt');
      assert(utils.stripFileName(1, '\\1\\2\\3\\4\\foo.txt', 'file') === '2/3/4/foo.txt');
      assert(utils.stripFileName(2, '\\1\\2\\3\\4\\foo.txt', 'file') === '3/4/foo.txt');
      assert(utils.stripFileName(3, '\\1\\2\\3\\4\\foo.txt', 'file') === '4/foo.txt');
    });
  });
});
