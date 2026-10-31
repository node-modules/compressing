'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const compressing = require('../..');
const { createTarBuffer } = require('../util');

describe('test/tar/security-GHSA-grx6-75c5-f738.test.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compressing-symlink-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  [ 'tar', 'tgz' ].forEach(format => {
    describe(format, () => {
      async function extract(entries, destDir, opts) {
        const tarBuffer = await createTarBuffer(entries);
        const archive = format === 'tgz' ? zlib.gzipSync(tarBuffer) : tarBuffer;
        await compressing[format].uncompress(archive, destDir, opts);
      }

      [ 'existing target', 'dangling target', 'strip' ].forEach(scenario => {
        it(`should block a symlink escape through repeated directory links (${scenario})`, async () => {
          const targetExists = scenario !== 'dangling target';
          const strip = scenario === 'strip' ? 1 : 0;
          const prefix = strip ? 'package/' : '';

          // Eight textual parent segments collapse to the extraction root. Keep
          // the actual target inside tempDir, eight levels above that root.
          const destDir = path.join(tempDir, ...Array(8).fill('dest'));
          const outsideFile = path.join(tempDir, 'outside.txt');
          if (targetExists) fs.writeFileSync(outsideFile, 'original');

          await extract([
            { name: `${prefix}sub/`, type: 'directory' },
            { name: `${prefix}sub/d`, type: 'symlink', linkname: '..' },
            { name: `${prefix}${'sub/d/'.repeat(4)}link`, type: 'symlink', linkname: `${'../'.repeat(8)}outside.txt` },
            { name: `${prefix}after.txt`, content: 'safe' },
          ], destDir, { strip });

          assert.strictEqual(fs.realpathSync(path.join(destDir, 'sub/d')), fs.realpathSync(destDir));
          // existsSync() also returns false for dangling links, so use lstat().
          assert.throws(() => fs.lstatSync(path.join(destDir, 'link')), { code: 'ENOENT' });
          assert.strictEqual(fs.readFileSync(path.join(destDir, 'after.txt'), 'utf8'), 'safe');
          if (targetExists) {
            assert.strictEqual(fs.readFileSync(outsideFile, 'utf8'), 'original');
          } else {
            assert.strictEqual(fs.existsSync(outsideFile), false);
          }
        });
      });

      it('should still block a target that escapes the textual parent', async () => {
        const destDir = path.join(tempDir, 'dest');
        await extract([
          { name: 'sub/', type: 'directory' },
          { name: 'sub/d', type: 'symlink', linkname: '..' },
          { name: `${'sub/d/'.repeat(4)}link`, type: 'symlink', linkname: `${'../'.repeat(9)}outside.txt` },
        ], destDir);

        assert.throws(() => fs.lstatSync(path.join(destDir, 'link')), { code: 'ENOENT' });
      });

      it('should normalize directory-link traversal in the symlink target', async () => {
        const destDir = path.join(tempDir, ...Array(8).fill('dest'));
        const outsideFile = path.join(tempDir, 'target.txt');
        fs.writeFileSync(outsideFile, 'outside');

        await extract([
          { name: 'sub/', type: 'directory' },
          { name: 'sub/d', type: 'symlink', linkname: '..' },
          { name: 'link', type: 'symlink', linkname: `${'sub/d/'.repeat(4)}${'../'.repeat(8)}target.txt` },
        ], destDir);

        const link = path.join(destDir, 'link');
        // The raw target would follow sub/d back to destDir before walking up.
        assert.strictEqual(fs.readlinkSync(link), 'target.txt');
        assert.throws(() => fs.realpathSync(link), { code: 'ENOENT' });
        fs.writeFileSync(path.join(destDir, 'target.txt'), 'inside');
        assert.strictEqual(fs.readFileSync(link, 'utf8'), 'inside');
        assert.strictEqual(fs.readFileSync(outsideFile, 'utf8'), 'outside');
      });

      it('should block a symlink target that still escapes after normalization', async () => {
        const destDir = path.join(tempDir, ...Array(8).fill('dest'));
        const outsideFile = path.join(tempDir, 'target.txt');
        fs.writeFileSync(outsideFile, 'outside');

        await extract([
          { name: 'sub/', type: 'directory' },
          { name: 'sub/d', type: 'symlink', linkname: '..' },
          { name: 'link', type: 'symlink', linkname: `${'sub/d/'.repeat(2)}${'../'.repeat(8)}target.txt` },
          { name: 'after.txt', content: 'safe' },
        ], destDir);

        assert.throws(() => fs.lstatSync(path.join(destDir, 'link')), { code: 'ENOENT' });
        assert.strictEqual(fs.readFileSync(path.join(destDir, 'after.txt'), 'utf8'), 'safe');
        assert.strictEqual(fs.readFileSync(outsideFile, 'utf8'), 'outside');
      });

      [ 'relative', 'absolute', 'external symlink' ].forEach(scenario => {
        it(`should extract a file at the parent path of a rejected symlink (${scenario})`, async () => {
          const destDir = path.join(tempDir, 'dest');
          const outsideDir = path.join(tempDir, 'outside');
          fs.mkdirSync(outsideDir);
          fs.writeFileSync(path.join(outsideDir, 'target.txt'), 'original');

          let linkname = '../../../outside/target.txt';
          if (scenario === 'absolute') {
            linkname = path.join(outsideDir, 'target.txt');
          } else if (scenario === 'external symlink') {
            fs.mkdirSync(destDir);
            fs.symlinkSync(outsideDir, path.join(destDir, 'escape'), 'dir');
            linkname = '../../escape/target.txt';
          }

          await extract([
            { name: 'payload/nested/link', type: 'symlink', linkname },
            { name: 'payload', content: 'safe' },
            { name: 'after.txt', content: 'safe' },
          ], destDir);

          assert.strictEqual(fs.lstatSync(path.join(destDir, 'payload')).isFile(), true);
          assert.strictEqual(fs.readFileSync(path.join(destDir, 'payload'), 'utf8'), 'safe');
          assert.strictEqual(fs.readFileSync(path.join(destDir, 'after.txt'), 'utf8'), 'safe');
          assert.strictEqual(fs.readFileSync(path.join(outsideDir, 'target.txt'), 'utf8'), 'original');
        });
      });

      it('should check the real parent when intermediate directories must be created', async () => {
        const destDir = path.join(tempDir, 'dest');
        await extract([
          { name: 'sub/', type: 'directory' },
          { name: 'sub/d', type: 'symlink', linkname: '..' },
          { name: 'sub/d/new/link', type: 'symlink', linkname: '../../outside.txt' },
        ], destDir);

        assert.throws(() => fs.lstatSync(path.join(destDir, 'new')), { code: 'ENOENT' });
      });

      it('should allow a safe relative target through directory links', async () => {
        const destDir = path.join(tempDir, 'dest');
        await extract([
          { name: 'sub/', type: 'directory' },
          { name: 'sub/d', type: 'symlink', linkname: '..' },
          { name: 'sub/d/sub/d/new/link', type: 'symlink', linkname: '../target.txt' },
          { name: 'sub/d/sub/d/new/self', type: 'symlink', linkname: '.' },
          { name: 'target.txt', content: 'safe' },
        ], destDir);

        const link = path.join(destDir, 'new/link');
        assert.strictEqual(fs.lstatSync(link).isSymbolicLink(), true);
        assert.strictEqual(fs.realpathSync(link), fs.realpathSync(path.join(destDir, 'target.txt')));
        assert.strictEqual(fs.readFileSync(link, 'utf8'), 'safe');
        assert.strictEqual(fs.realpathSync(path.join(destDir, 'new/self')), fs.realpathSync(path.join(destDir, 'new')));
      });

      it('should block an internal target that resolves through an external symlink', async () => {
        const destDir = path.join(tempDir, 'dest');
        const outsideDir = path.join(tempDir, 'outside');
        fs.mkdirSync(destDir);
        fs.mkdirSync(outsideDir);
        fs.writeFileSync(path.join(outsideDir, 'target.txt'), 'original');
        fs.symlinkSync(outsideDir, path.join(destDir, 'outside'), 'dir');

        await extract([
          { name: 'sub/', type: 'directory' },
          { name: 'sub/d', type: 'symlink', linkname: '..' },
          { name: 'sub/d/sub/d/link', type: 'symlink', linkname: 'outside/target.txt' },
        ], destDir);

        assert.throws(() => fs.lstatSync(path.join(destDir, 'link')), { code: 'ENOENT' });
        assert.strictEqual(fs.readFileSync(path.join(outsideDir, 'target.txt'), 'utf8'), 'original');
      });

      it('should preserve an internal absolute target through directory links', async () => {
        const destDir = path.join(tempDir, 'dest');
        const target = path.join(destDir, 'target.txt');
        await extract([
          { name: 'sub/', type: 'directory' },
          { name: 'sub/d', type: 'symlink', linkname: '..' },
          { name: 'target.txt', content: 'safe' },
          { name: 'sub/d/sub/d/link', type: 'symlink', linkname: target },
        ], destDir);

        const link = path.join(destDir, 'link');
        assert.strictEqual(fs.realpathSync(link), fs.realpathSync(target));
        assert.strictEqual(fs.readFileSync(link, 'utf8'), 'safe');
      });

      [ 'existing', 'dangling' ].forEach(scenario => {
        it(`should preserve ${scenario} internal targets after moving an aliased extraction root`, async () => {
          const targetExists = scenario === 'existing';
          const realBase = path.join(tempDir, 'real');
          const alias = path.join(tempDir, 'alias');
          fs.mkdirSync(realBase);
          fs.symlinkSync(realBase, alias, 'dir');
          const destDir = path.join(alias, 'dest');
          // Match the extractor's native realpath resolution, including Windows
          // short paths such as RUNNER~1.
          const realDestDir = path.join(await fs.promises.realpath(realBase), 'dest');

          const entries = [
            { name: 'nested/relative', type: 'symlink', linkname: '../target.txt' },
            { name: 'nested/absolute', type: 'symlink', linkname: path.join(destDir, 'target.txt') },
            { name: 'nested/canonical', type: 'symlink', linkname: path.join(realDestDir, 'target.txt') },
          ];
          if (targetExists) entries.unshift({ name: 'target.txt', content: 'safe' });
          await extract(entries, destDir);

          const movedDir = path.join(tempDir, 'moved');
          fs.renameSync(destDir, movedDir);
          if (!targetExists) {
            assert.throws(() => fs.realpathSync(path.join(movedDir, 'nested/absolute')), { code: 'ENOENT' });
            fs.writeFileSync(path.join(movedDir, 'target.txt'), 'safe');
          }

          for (const name of [ 'relative', 'absolute', 'canonical' ]) {
            const link = path.join(movedDir, 'nested', name);
            assert.strictEqual(fs.realpathSync(link), fs.realpathSync(path.join(movedDir, 'target.txt')));
            assert.strictEqual(fs.readFileSync(link, 'utf8'), 'safe');
            assert.strictEqual(fs.readlinkSync(link), path.join('..', 'target.txt'));
          }
        });
      });
    });
  });
});
