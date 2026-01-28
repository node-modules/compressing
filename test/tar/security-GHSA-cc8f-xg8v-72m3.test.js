'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuid = require('uuid');
const assert = require('assert');
const tar = require('tar-stream');
const compressing = require('../..');

describe('test/tar/security-GHSA-cc8f-xg8v-72m3.test.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), uuid.v4());
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper function to create a TAR buffer with given entries
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

  describe('symlink escape vulnerability (CVE-2021-32803 style)', () => {
    it('should block symlink pointing outside extraction directory', async () => {
      const destDir = path.join(tempDir, 'dest');
      const escapedFile = path.join(tempDir, 'escaped.txt');

      // Create malicious TAR:
      // 1. Symlink "escape" -> ".." (points to parent of dest)
      // 2. File "escape/escaped.txt" (would write to tempDir/escaped.txt if symlink was followed)
      const tarBuffer = await createTarBuffer([
        { name: 'escape', type: 'symlink', linkname: '..' },
        { name: 'escape/escaped.txt', type: 'file', content: 'malicious content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The escaped file should NOT exist in the parent directory
      assert.strictEqual(fs.existsSync(escapedFile), false, 'File should not be written outside destination');

      // The symlink should NOT exist as a symlink (it may exist as a directory now)
      const escapePath = path.join(destDir, 'escape');
      if (fs.existsSync(escapePath)) {
        const stat = fs.lstatSync(escapePath);
        assert.strictEqual(stat.isSymbolicLink(), false, 'Path should not be a symlink');
      }
    });

    it('should block symlink pointing to absolute path outside extraction directory', async () => {
      const destDir = path.join(tempDir, 'dest');
      const escapedFile = path.join(tempDir, 'poc.txt');

      // Create malicious TAR with symlink pointing to absolute path
      const tarBuffer = await createTarBuffer([
        { name: 'myTmp', type: 'symlink', linkname: tempDir },
        { name: 'myTmp/poc.txt', type: 'file', content: 'malicious content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The escaped file should NOT exist
      assert.strictEqual(fs.existsSync(escapedFile), false, 'File should not be written via symlink escape');
    });

    it('should block symlink with absolute path target like /etc/passwd', async () => {
      const destDir = path.join(tempDir, 'dest');

      // Create malicious TAR with symlink pointing to /etc/passwd
      const tarBuffer = await createTarBuffer([
        { name: 'passwd', type: 'symlink', linkname: '/etc/passwd' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The symlink should NOT be created
      assert.strictEqual(fs.existsSync(path.join(destDir, 'passwd')), false, 'Symlink to /etc/passwd should not be created');
    });
  });

  describe('path traversal via file entries', () => {
    it('should block file entry with ../ path traversal', async () => {
      const destDir = path.join(tempDir, 'dest');
      const escapedFile = path.join(tempDir, 'traversed.txt');

      // Create malicious TAR with path traversal
      const tarBuffer = await createTarBuffer([
        { name: '../traversed.txt', type: 'file', content: 'malicious' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The file should NOT exist outside destination
      assert.strictEqual(fs.existsSync(escapedFile), false, 'File should not be written via path traversal');
    });

    it('should block file entry with nested ../ path traversal', async () => {
      const destDir = path.join(tempDir, 'dest');
      const escapedFile = path.join(tempDir, 'nested-escape.txt');

      // Create malicious TAR with nested path traversal
      const tarBuffer = await createTarBuffer([
        { name: 'foo/bar/../../nested-escape.txt', type: 'file', content: 'malicious' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The file should NOT exist outside destination
      // (Note: The file might be written as dest/nested-escape.txt after normalization, which is acceptable)
      assert.strictEqual(fs.existsSync(escapedFile), false, 'File should not escape to parent via nested traversal');
    });

    it('should block directory entry with ../ path traversal', async () => {
      const destDir = path.join(tempDir, 'dest');
      const escapedDir = path.join(tempDir, 'escaped-dir');

      // Create malicious TAR with directory path traversal
      const tarBuffer = await createTarBuffer([
        { name: '../escaped-dir', type: 'directory' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // The directory should NOT exist outside destination
      assert.strictEqual(fs.existsSync(escapedDir), false, 'Directory should not be created via path traversal');
    });
  });

  describe('backward compatibility - valid symlinks', () => {
    it('should allow valid internal symlinks', async () => {
      const destDir = path.join(tempDir, 'dest');

      // Create TAR with valid internal symlink
      const tarBuffer = await createTarBuffer([
        { name: 'real-file.txt', type: 'file', content: 'hello world' },
        { name: 'link-to-file.txt', type: 'symlink', linkname: 'real-file.txt' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // Both files should exist
      assert.strictEqual(fs.existsSync(path.join(destDir, 'real-file.txt')), true, 'Real file should exist');
      assert.strictEqual(fs.existsSync(path.join(destDir, 'link-to-file.txt')), true, 'Symlink should exist');

      // Symlink should point to the real file
      const linkTarget = fs.readlinkSync(path.join(destDir, 'link-to-file.txt'));
      assert.strictEqual(linkTarget, 'real-file.txt', 'Symlink should point to real-file.txt');
    });

    it('should allow symlinks within subdirectories', async () => {
      const destDir = path.join(tempDir, 'dest');

      // Create TAR with valid symlink in subdirectory
      const tarBuffer = await createTarBuffer([
        { name: 'subdir/', type: 'directory' },
        { name: 'subdir/file.txt', type: 'file', content: 'content' },
        { name: 'subdir/link.txt', type: 'symlink', linkname: 'file.txt' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      // Both should exist
      assert.strictEqual(fs.existsSync(path.join(destDir, 'subdir/file.txt')), true);
      assert.strictEqual(fs.existsSync(path.join(destDir, 'subdir/link.txt')), true);
    });

    it('should extract symlink.tgz fixture correctly', async () => {
      const sourceFile = path.join(__dirname, '..', 'fixtures', 'symlink.tgz');
      const destDir = path.join(tempDir, 'symlink-test');

      // This should not throw
      await compressing.tgz.uncompress(sourceFile, destDir);

      // Verify destination was created
      assert.strictEqual(fs.existsSync(destDir), true, 'Destination directory should exist');
    });
  });

  describe('edge cases', () => {
    it('should handle empty TAR', async () => {
      const destDir = path.join(tempDir, 'dest');
      const tarBuffer = await createTarBuffer([]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(fs.existsSync(destDir), true, 'Destination should be created');
    });

    it('should handle normal files correctly', async () => {
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
