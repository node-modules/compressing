'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { randomUUID } = require('node:crypto');
const assert = require('assert');
const compressing = require('../..');
const { createTarBuffer, createZipBuffer } = require('../util');

// Extraction resolves a symlink chain hop by hop when realpath() cannot, so an
// entry whose destination passes through several links still lands where the
// resolved chain actually points, and never outside the extraction directory.
describe('test/tar/symlink-resolution.test.js', () => {
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

  // destDir/entry -> destDir/hop -> outsideDir/other.txt, which does not exist,
  // so realpath() cannot resolve the chain and each hop is walked by hand.
  function setupChain(destDir, outsideDir) {
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.mkdirSync(destDir, { recursive: true });
    fs.symlinkSync(path.join(destDir, 'hop'), path.join(destDir, 'entry'));
    fs.symlinkSync(path.join(outsideDir, 'other.txt'), path.join(destDir, 'hop'));
  }

  // destDir/entry -> linkedDir/other.txt, where destDir/linkedDir -> outsideDir
  function setupLinkedDir(destDir, outsideDir) {
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.mkdirSync(destDir, { recursive: true });
    fs.symlinkSync(outsideDir, path.join(destDir, 'linkedDir'));
    fs.symlinkSync(path.join('linkedDir', 'other.txt'), path.join(destDir, 'entry'));
  }

  describe('a chain whose first hop stays inside destDir', () => {
    it('should not write past the end of the chain', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      setupChain(destDir, outsideDir);

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(
        fs.existsSync(path.join(outsideDir, 'other.txt')),
        false,
        'The entry should not be written at the end of the chain'
      );
    });

    it('should handle a chain longer than two hops', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.mkdirSync(destDir, { recursive: true });
      fs.symlinkSync(path.join(destDir, 'hop1'), path.join(destDir, 'entry'));
      fs.symlinkSync(path.join(destDir, 'hop2'), path.join(destDir, 'hop1'));
      fs.symlinkSync(path.join(outsideDir, 'other.txt'), path.join(destDir, 'hop2'));

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(fs.existsSync(path.join(outsideDir, 'other.txt')), false);
    });

    it('should behave the same in tgz extraction', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      setupChain(destDir, outsideDir);

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'content' },
      ]);
      await compressing.tgz.uncompress(await gzipBuffer(tarBuffer), destDir);

      assert.strictEqual(fs.existsSync(path.join(outsideDir, 'other.txt')), false);
    });

    it('should behave the same in zip extraction', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      setupChain(destDir, outsideDir);

      const zipBuffer = await createZipBuffer([
        { name: 'entry', content: 'content' },
      ]);
      await compressing.zip.uncompress(zipBuffer, destDir);

      assert.strictEqual(fs.existsSync(path.join(outsideDir, 'other.txt')), false);
    });
  });

  describe('a chain passing through a linked directory', () => {
    it('should resolve the directory component of the link target', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      setupLinkedDir(destDir, outsideDir);

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(
        fs.existsSync(path.join(outsideDir, 'other.txt')),
        false,
        'The linked directory in the target should be resolved, not taken literally'
      );
    });

    it('should behave the same in tgz extraction', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      setupLinkedDir(destDir, outsideDir);

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'content' },
      ]);
      await compressing.tgz.uncompress(await gzipBuffer(tarBuffer), destDir);

      assert.strictEqual(fs.existsSync(path.join(outsideDir, 'other.txt')), false);
    });

    it('should behave the same in zip extraction', async () => {
      const destDir = path.join(tempDir, 'dest');
      const outsideDir = path.join(tempDir, 'outside');
      setupLinkedDir(destDir, outsideDir);

      const zipBuffer = await createZipBuffer([
        { name: 'entry', content: 'content' },
      ]);
      await compressing.zip.uncompress(zipBuffer, destDir);

      assert.strictEqual(fs.existsSync(path.join(outsideDir, 'other.txt')), false);
    });
  });

  describe('a symlink at the entry destination', () => {
    it('should be replaced by the entry instead of written through', async () => {
      const destDir = path.join(tempDir, 'dest');
      fs.mkdirSync(destDir, { recursive: true });
      fs.symlinkSync(path.join(destDir, 'hop'), path.join(destDir, 'entry'));
      fs.symlinkSync(path.join(destDir, 'final.txt'), path.join(destDir, 'hop'));

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(
        fs.lstatSync(path.join(destDir, 'entry')).isSymbolicLink(),
        false,
        'The symlink at the destination should have been replaced by a regular file'
      );
      assert.strictEqual(fs.readFileSync(path.join(destDir, 'entry'), 'utf8'), 'content');
      assert.strictEqual(
        fs.existsSync(path.join(destDir, 'final.txt')),
        false,
        'The chain should not have been followed to its target'
      );
    });

    it('should leave the file the symlink points at untouched', async () => {
      const destDir = path.join(tempDir, 'dest');
      fs.mkdirSync(destDir, { recursive: true });
      const target = path.join(destDir, 'target.txt');
      fs.writeFileSync(target, 'ORIGINAL_CONTENT');
      fs.symlinkSync(target, path.join(destDir, 'entry'));

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'new content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(
        fs.readFileSync(target, 'utf8'),
        'ORIGINAL_CONTENT',
        'Writing an entry must not reach through a symlink to its target'
      );
      assert.strictEqual(fs.readFileSync(path.join(destDir, 'entry'), 'utf8'), 'new content');
    });
  });

  describe('linked directories inside destDir', () => {
    it('should still be traversed when writing an entry beneath them', async () => {
      const destDir = path.join(tempDir, 'dest');
      const realDir = path.join(destDir, 'real');
      fs.mkdirSync(realDir, { recursive: true });
      fs.symlinkSync(realDir, path.join(destDir, 'linkDir'));

      const tarBuffer = await createTarBuffer([
        { name: 'linkDir/final.txt', type: 'file', content: 'content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(
        fs.readFileSync(path.join(realDir, 'final.txt'), 'utf8'),
        'content',
        'A linked directory inside destDir should still be traversed'
      );
    });
  });

  describe('an extraction directory reached through a symlink', () => {
    // destDir is given as linkBase/dest while its real path is realBase/dest, the
    // shape /var -> /private/var produces on macOS. A link target written in the
    // real namespace must still be recognised as living inside destDir.
    //
    // Skipped on Windows, where a dangling link resolves differently and the entry
    // is skipped regardless. That behaviour predates this change, and the namespace
    // divergence covered here is a POSIX shape.
    const itPosix = process.platform === 'win32' ? it.skip : it;

    itPosix('should accept a dangling target written in the real namespace', async () => {
      const realBase = path.join(tempDir, 'realBase');
      const linkBase = path.join(tempDir, 'linkBase');
      fs.mkdirSync(path.join(realBase, 'dest'), { recursive: true });
      fs.symlinkSync(realBase, linkBase);

      const destDir = path.join(linkBase, 'dest');
      // realpathSync, not the realBase path: tempDir may itself sit behind a symlink.
      const realDest = fs.realpathSync(path.join(realBase, 'dest'));
      fs.symlinkSync(path.join(realDest, 'final.txt'), path.join(destDir, 'entry'));

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(
        fs.readFileSync(path.join(destDir, 'entry'), 'utf8'),
        'content',
        'A target inside destDir should be accepted whichever namespace names it'
      );
    });
  });

  describe('symlink cycles', () => {
    it('should terminate rather than loop', async () => {
      const destDir = path.join(tempDir, 'dest');
      fs.mkdirSync(destDir, { recursive: true });
      fs.symlinkSync(path.join(destDir, 'b'), path.join(destDir, 'entry'));
      fs.symlinkSync(path.join(destDir, 'entry'), path.join(destDir, 'b'));

      const tarBuffer = await createTarBuffer([
        { name: 'entry', type: 'file', content: 'content' },
      ]);

      await compressing.tar.uncompress(tarBuffer, destDir);

      assert.strictEqual(fs.lstatSync(path.join(destDir, 'entry')).isSymbolicLink(), true);
    });
  });
});
