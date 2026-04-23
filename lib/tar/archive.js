'use strict';

const { createTar } = require('nanotar');

const TAR_BLOCK_SIZE = 512;
const TAR_END_BLOCK_SIZE = 1024;

function normalizeData(data) {
  if (data === undefined || data === null) return undefined;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (typeof data === 'string') return Buffer.from(data);
  return Buffer.from(data);
}

function normalizeMode(mode, defaultMode) {
  if (mode === undefined || mode === null || mode === '') return defaultMode;
  if (typeof mode === 'number') return (mode & 0o7777).toString(8);
  return String(mode).replace(/^0+/, '') || '0';
}

function isSymlinkEntry(entry) {
  return entry.type === 'symlink' || entry.type === 'symbolicLink';
}

function normalizeEntry(entry) {
  const data = normalizeData(entry.data);
  const isDirectory = entry.type === 'directory';
  const mode = normalizeMode(entry.attrs && entry.attrs.mode, isDirectory ? '775' : '664');
  const mtime = entry.attrs && entry.attrs.mtime;
  return {
    name: isDirectory && !entry.name.endsWith('/') ? `${entry.name}/` : entry.name,
    data,
    linkname: entry.linkname,
    type: isDirectory ? 'directory' : (isSymlinkEntry(entry) ? 'symlink' : 'file'),
    attrs: {
      mode,
      mtime,
      uid: entry.attrs && entry.attrs.uid,
      gid: entry.attrs && entry.attrs.gid,
      user: entry.attrs && entry.attrs.user,
      group: entry.attrs && entry.attrs.group,
    },
  };
}

function canUseNanotar(entries) {
  return entries.every(entry => !isSymlinkEntry(entry));
}

function createTarBuffer(entries) {
  const normalizedEntries = entries.map(normalizeEntry);

  if (canUseNanotar(normalizedEntries)) {
    return Buffer.from(createTar(normalizedEntries.map(entry => ({
      name: entry.name,
      data: entry.type === 'directory' ? undefined : entry.data,
      attrs: entry.attrs,
    }))));
  }

  const chunks = [];
  for (const entry of normalizedEntries) {
    const data = entry.type === 'file' ? (entry.data || Buffer.alloc(0)) : Buffer.alloc(0);
    chunks.push(createHeader(entry, data.length));
    if (data.length > 0) {
      chunks.push(data);
      const paddingSize = (TAR_BLOCK_SIZE - (data.length % TAR_BLOCK_SIZE)) % TAR_BLOCK_SIZE;
      if (paddingSize > 0) chunks.push(Buffer.alloc(paddingSize));
    }
  }
  chunks.push(Buffer.alloc(TAR_END_BLOCK_SIZE));
  return Buffer.concat(chunks);
}

function createHeader(entry, size) {
  const header = Buffer.alloc(TAR_BLOCK_SIZE);
  const pathParts = splitTarPath(entry.name);
  writeString(header, pathParts.name, 0, 100);
  writeOctal(header, entry.attrs.mode, 100, 8);
  writeOctal(header, entry.attrs.uid || 0, 108, 8);
  writeOctal(header, entry.attrs.gid || 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, normalizeMtime(entry.attrs.mtime), 136, 12);
  writeString(header, entry.type === 'directory' ? '5' : (entry.type === 'symlink' ? '2' : '0'), 156, 1);
  writeString(header, entry.linkname || '', 157, 100);
  writeString(header, 'ustar', 257, 6);
  writeString(header, '00', 263, 2);
  writeString(header, entry.attrs.user || '', 265, 32);
  writeString(header, entry.attrs.group || '', 297, 32);
  writeString(header, pathParts.prefix, 345, 155);
  header.fill(0x20, 148, 156);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeChecksum(header, checksum, 148, 8);
  return header;
}

function splitTarPath(name) {
  if (Buffer.byteLength(name) <= 100) {
    return { name, prefix: '' };
  }

  const segments = name.split('/');
  for (let i = segments.length - 1; i > 0; i--) {
    const prefix = segments.slice(0, i).join('/');
    const tail = segments.slice(i).join('/');
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(tail) <= 100) {
      return { name: tail, prefix };
    }
  }

  throw new Error(`TAR entry path is too long: ${name}`);
}

function writeString(buffer, value, offset, length) {
  const stringBuffer = Buffer.from(String(value));
  stringBuffer.copy(buffer, offset, 0, Math.min(stringBuffer.length, length));
}

function writeOctal(buffer, value, offset, length) {
  const stringValue = typeof value === 'string' ? value : Number(value || 0).toString(8);
  const padded = stringValue.padStart(length - 1, '0');
  writeString(buffer, padded, offset, length - 1);
}

function writeChecksum(buffer, value, offset, length) {
  const stringValue = Number(value || 0).toString(8).padStart(length - 2, '0');
  writeString(buffer, stringValue, offset, length - 2);
  buffer[offset + length - 2] = 0;
  buffer[offset + length - 1] = 0x20;
}

function normalizeMtime(mtime) {
  if (mtime === undefined || mtime === null) return Math.floor(Date.now() / 1000);
  const numericMtime = Number(mtime);
  if (!Number.isFinite(numericMtime)) return Math.floor(Date.now() / 1000);
  return numericMtime > 1e12 ? Math.floor(numericMtime / 1000) : Math.floor(numericMtime);
}

function parseTarBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);

  const entries = [];
  let offset = 0;
  let nextLongName;
  let nextLongLinkname;
  let nextExtendedHeader;
  let globalExtendedHeader = {};

  while (offset + TAR_BLOCK_SIZE <= buffer.length) {
    const header = buffer.subarray(offset, offset + TAR_BLOCK_SIZE);
    if (isZeroBlock(header)) break;

    const size = readOctal(header, 124, 12);
    const dataOffset = offset + TAR_BLOCK_SIZE;
    const dataEnd = dataOffset + size;
    const blockSize = Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
    const typeflag = readString(header, 156, 1) || '0';
    const prefix = readString(header, 345, 155);
    let name = readString(header, 0, 100);
    if (prefix) name = `${prefix}/${name}`;
    let linkname = readString(header, 157, 100);
    const data = buffer.subarray(dataOffset, dataEnd);

    if (typeflag === 'L') {
      nextLongName = readBufferString(data);
      offset = dataOffset + blockSize;
      continue;
    }

    if (typeflag === 'K') {
      nextLongLinkname = readBufferString(data);
      offset = dataOffset + blockSize;
      continue;
    }

    if (typeflag === 'x') {
      nextExtendedHeader = parsePaxHeaders(data);
      offset = dataOffset + blockSize;
      continue;
    }

    if (typeflag === 'g') {
      globalExtendedHeader = Object.assign(globalExtendedHeader, parsePaxHeaders(data));
      offset = dataOffset + blockSize;
      continue;
    }

    const effectiveHeaders = Object.assign({}, globalExtendedHeader, nextExtendedHeader);
    if (nextLongName) {
      name = nextLongName;
      nextLongName = undefined;
    } else if (effectiveHeaders.path) {
      name = effectiveHeaders.path;
    }

    if (nextLongLinkname) {
      linkname = nextLongLinkname;
      nextLongLinkname = undefined;
    } else if (effectiveHeaders.linkpath) {
      linkname = effectiveHeaders.linkpath;
    }
    nextExtendedHeader = undefined;

    const type = mapType(typeflag);
    if (type === 'directory' && name && !name.endsWith('/')) {
      name += '/';
    }

    entries.push({
      header: {
        name,
        type,
        mode: readOctal(header, 100, 8),
        linkname,
      },
      data: type === 'file' ? Buffer.from(data) : Buffer.alloc(0),
    });

    offset = dataOffset + blockSize;
  }

  return entries;
}

function isZeroBlock(block) {
  for (const byte of block) {
    if (byte !== 0) return false;
  }
  return true;
}

function readString(buffer, offset, length) {
  const slice = buffer.subarray(offset, offset + length);
  const zeroIndex = slice.indexOf(0);
  return slice.subarray(0, zeroIndex === -1 ? slice.length : zeroIndex).toString();
}

function readBufferString(buffer) {
  const zeroIndex = buffer.indexOf(0);
  return buffer.subarray(0, zeroIndex === -1 ? buffer.length : zeroIndex).toString();
}

function readOctal(buffer, offset, length) {
  const value = readString(buffer, offset, length).trim();
  if (!value) return 0;
  return parseInt(value, 8);
}

function parsePaxHeaders(buffer) {
  const headers = {};
  let offset = 0;

  while (offset < buffer.length) {
    const spaceIndex = buffer.indexOf(0x20, offset);
    if (spaceIndex === -1) break;
    const recordLength = parseInt(buffer.subarray(offset, spaceIndex).toString(), 10);
    if (!Number.isFinite(recordLength) || recordLength <= 0) break;
    const record = buffer.subarray(spaceIndex + 1, offset + recordLength - 1).toString();
    const separatorIndex = record.indexOf('=');
    if (separatorIndex !== -1) {
      headers[record.slice(0, separatorIndex)] = record.slice(separatorIndex + 1);
    }
    offset += recordLength;
  }

  return headers;
}

function mapType(typeflag) {
  if (typeflag === '2') return 'symlink';
  if (typeflag === '5') return 'directory';
  return 'file';
}

module.exports = {
  createTarBuffer,
  parseTarBuffer,
};
