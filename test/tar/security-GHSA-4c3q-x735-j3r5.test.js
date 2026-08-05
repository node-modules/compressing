'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { randomUUID } = require('node:crypto');
const assert = require('assert');
const compressing = require('../..');
const { createTarBuffer } = require('../util');

describe('test/tar/security-GHSA-4c3q-x735-j3r5.test.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), randomUUID());
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function gzipBuffer(buf) {
    return new Promise((resolve, reject) => {
      zlib.gzip(buf, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  describe('pre-existing symlink file pointing outside destDir', () => {
    it('should block file write through pre-existing symlink to external file', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      const sensitiveFile = path.join(outsideDir, 'target.txt');

      // Setup: create the sensitive file and a pre-existing symlink in destDir
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.writeFileSync(sensitiveFile, 'ORIGINAL_SAFE_CONTENT');
      fs.mkdirSync(destDir, { recursive: true });
      fs.symlinkSync(sensitiveFile, path.join(destDir, 'config_file'));

      // Create a tar with a regular file entry matching the symlink name
      const tarBuffer = await createTarBuffer([
        { name: 'config_file', type: 'file', content: 'MALICIOUS_OVERWRITE' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The sensitive file should NOT have been overwritten
      assert.strictEqual(
        fs.readFileSync(sensitiveFile, 'utf8'),
        'ORIGINAL_SAFE_CONTENT',
        'Sensitive file should not be overwritten through pre-existing symlink'
      );
    });
  });

  describe('pre-existing symlink directory pointing outside destDir', () => {
    it('should block file write through pre-existing symlink directory', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');

      // Setup: create outside dir and a symlink directory in destDir
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.mkdirSync(destDir, { recursive: true });
      fs.symlinkSync(outsideDir, path.join(destDir, 'subdir'));

      // Create a tar with a file inside the symlink directory
      const tarBuffer = await createTarBuffer([
        { name: 'subdir/secret.txt', type: 'file', content: 'MALICIOUS_DATA' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The file should NOT exist in the outside directory
      assert.strictEqual(
        fs.existsSync(path.join(outsideDir, 'secret.txt')),
        false,
        'File should not be written through pre-existing symlink directory'
      );
    });
  });

  describe('deeply nested pre-existing symlink', () => {
    it('should block file write through nested symlink escape', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');

      // Setup: create real directories and a symlink deep in the tree
      fs.mkdirSync(path.join(destDir, 'a', 'b'), { recursive: true });
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.symlinkSync(outsideDir, path.join(destDir, 'a', 'b', 'c'));

      // Create a tar with a file through the deep symlink
      const tarBuffer = await createTarBuffer([
        { name: 'a/b/c/file.txt', type: 'file', content: 'ESCAPED_DATA' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The file should NOT exist in the outside directory
      assert.strictEqual(
        fs.existsSync(path.join(outsideDir, 'file.txt')),
        false,
        'File should not be written through deeply nested symlink'
      );
    });
  });

  describe('pre-existing symlink pointing within destDir (should be allowed)', () => {
    it('should allow file write through symlink that stays within destDir', async () => {
      const destDir = path.join(tempDir, 'dest');
      const realDir = path.join(destDir, 'real');

      // Setup: create real directory and internal symlink
      fs.mkdirSync(realDir, { recursive: true });
      fs.symlinkSync(realDir, path.join(destDir, 'link'));

      // Create a tar with a file through the internal symlink
      const tarBuffer = await createTarBuffer([
        { name: 'link/newfile.txt', type: 'file', content: 'safe content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The file SHOULD exist since the symlink points within destDir
      assert.strictEqual(
        fs.readFileSync(path.join(realDir, 'newfile.txt'), 'utf8'),
        'safe content',
        'File should be written through internal symlink'
      );
    });
  });

  describe('directory entry through pre-existing external symlink', () => {
    it('should block directory creation through pre-existing symlink', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');

      // Setup
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.mkdirSync(destDir, { recursive: true });
      fs.symlinkSync(outsideDir, path.join(destDir, 'escape'));

      // Create a tar with a directory entry through the symlink
      const tarBuffer = await createTarBuffer([
        { name: 'escape/newdir/', type: 'directory' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The directory should NOT exist in the outside directory
      assert.strictEqual(
        fs.existsSync(path.join(outsideDir, 'newdir')),
        false,
        'Directory should not be created through pre-existing symlink'
      );
    });
  });

  describe('tgz format shares the same protection', () => {
    it('should block file write through pre-existing symlink in tgz extraction', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      const sensitiveFile = path.join(outsideDir, 'target.txt');

      // Setup
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.writeFileSync(sensitiveFile, 'ORIGINAL_SAFE_CONTENT');
      fs.mkdirSync(destDir, { recursive: true });
      fs.symlinkSync(sensitiveFile, path.join(destDir, 'config_file'));

      // Create a tgz buffer
      const tarBuffer = await createTarBuffer([
        { name: 'config_file', type: 'file', content: 'MALICIOUS_OVERWRITE' },
      ]);
      const tgzBuffer = await gzipBuffer(tarBuffer);

      await compressing.tgz.uncompress(tgzBuffer, destDir);

      // The sensitive file should NOT have been overwritten
      assert.strictEqual(
        fs.readFileSync(sensitiveFile, 'utf8'),
        'ORIGINAL_SAFE_CONTENT',
        'TGZ: Sensitive file should not be overwritten through pre-existing symlink'
      );
    });
  });

  describe('normal extraction still works (regression)', () => {
    it('should extract files normally when no pre-existing symlinks', async () => {
      const destDir = path.join(tempDir, 'dest');

      const tarBuffer = await createTarBuffer([
        { name: 'file1.txt', type: 'file', content: 'content1' },
        { name: 'subdir/', type: 'directory' },
        { name: 'subdir/file2.txt', type: 'file', content: 'content2' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf8'), 'content1');
      assert.strictEqual(fs.readFileSync(path.join(destDir, 'subdir/file2.txt'), 'utf8'), 'content2');
    });
  });
});
