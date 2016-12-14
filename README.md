# compressible

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/compressible.svg?style=flat-square
[npm-url]: https://npmjs.org/package/compressible
[travis-image]: https://img.shields.io/travis/node-modules/compressible.svg?style=flat-square
[travis-url]: https://travis-ci.org/node-modules/compressible
[codecov-image]: https://codecov.io/gh/node-modules/compressible/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/node-modules/compressible
[david-image]: https://img.shields.io/david/node-modules/compressible.svg?style=flat-square
[david-url]: https://david-dm.org/node-modules/compressible
[snyk-image]: https://snyk.io/test/npm/compressible/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/compressible
[download-image]: https://img.shields.io/npm/dm/compressible.svg?style=flat-square
[download-url]: https://npmjs.org/package/compressible

The missing compress and uncompress lib for node.

__Currently uncompressing has not been supported yet.__

Currently supported:

- tar
- gzip
- tgz
- zip

## Install

```bash
npm install compressible
```

## Usage

### Compress a single file

Use gzip as an example, tar, tgz and zip is same as gzip.

__promise style__

```js
const compressible = require('compressible');

// compress a file
compressible.gzip.compressFile('file/path/to/compress', 'path/to/destination.gz')
.then(compressDone)
.catch(handleError);

// compress a file buffer
compressible.gzip.compressFile(buffer, 'path/to/destination.gz')
.then(compressDone)
.catch(handleError);

// compress a stream
compressible.gzip.compressFile(stream, 'path/to/destination.gz')
.then(compressDone)
.catch(handleError);
```

__stream style__

```js
const compressible = require('compressible');

new compressible.gzip.FileStream({ source: 'file/path/to/compress' })
.on('error', handleError)
.pipe(fs.createWriteStream('path/to/destination.gz'))
.on('error', handleError);

// It's a transform stream, so you can pipe to it
fs.createReadStream('file/path/to/compress')
.on('error', handleError)
.pipe(new compressible.gzip.FileStream())
.on('error', handleError)
.pipe(fs.createWriteStream('path/to/destination.gz'))
.on('error', handleError);

// You should take care of stream errors in caution, use multipipe to handle error in one place
const pipe = require('multipipe';)
const sourceStream = fs.createReadStream('file/path/to/compress')
const gzipStream = new compressible.gzip.FileStream();
const destStream = fs.createWriteStream('path/to/destination.gz');
pipe(sourceStream, gzipStream, destStream, err => handleError);
```


### Compress a dir

Use tar as an example, tgz and zip is same as gzip.

__Gzip only support compressing a single file. if you want to compress a dir with gzip, then you may need tgz instead.__

__promise style__

```js
const compressible = require('compressible');
compressible.tar.compressDir('dir/path/to/compress', 'path/to/destination.tar')
.then(compressDone)
.catch(handleError);
```

__stream style__

```js
const compressible = require('compressible');

const tarStream = new compressible.tar.Stream();
tarStream.addEntry('dir/path/to/compress');

tarStream
.on('error', handleError)
.pipe(fs.createWriteStream('path/to/destination.tar'))
.on('error', handleError);

// You should take care of stream errors in caution, use multipipe to handle error in one place
const tarStream = new compressible.tar.Stream();
tarStream.addEntry('dir/path/to/compress');
const destStream = fs.createWriteStream('path/to/destination.tar');
pipe(tarStream, destStream, handleError);
```

Stream is very powerful, you can compress multiple entries in it;

```js
const tarStream = new compressible.tar.Stream();
// dir
tarStream.addEntry('dir/path/to/compress');

// file
tarStream.addEntry('file/path/to/compress');

// buffer
tarStream.addEntry(buffer);

// stream
tarStream.addEntry(stream);

const destStream = fs.createWriteStream('path/to/destination.tar');
pipe(tarStream, destStream, handleError);
```

## API

### compressFile

Use this API to compress a single file. This is a convenient method, which wraps FileStream API below, but you can handle error in one place.

- gzip.compressFile(source, dest, opts)
- tar.compressFile(source, dest, opts)
- tgz.compressFile(source, dest, opts)
- zip.compressFile(source, dest, opts)

Params

- source {String|Buffer|Stream} - source to be compressed, could be a file path, buffer, or a readable stream
- dest {String|Stream} - compressing destination, could be a file path(eg. `/path/to/xx.tgz`), or a writable stream.
- opts {Object} - usually you don't need it

Returns a promise object.

### compressDir

Use this API to compress a dir. This is a convenient method, which wraps Stream API below, but you can handle error in one place.

__Note: gzip do not have a compressDir method, you may need tgz instead.__

- tar.compressDir(dir, dest, opts)
- tgz.compressDir(dir, dest, opts)
- zip.compressDir(dir, dest, opts)

Params

- dir {String|Buffer|Stream} - dir path to be compressed
- dest {String|Stream} - compressing destination, could be a file path(eg. `/path/to/xx.tgz`), or a writable stream.
- opts {Object} - usually you don't need it

### FileStream

The transform stream to compress a single file.

__Note: If you are not very familiar with streams, just use compressFile() API, error can be handled in one place.__

- new gzip.FileStream(opts)
- new tar.FileStream(opts)
- new tgz.FileStream(opts)
- new zip.FileStream(opts)

Common params:

- opts.source {String|Buffer|Stream} - source to be compressed, could be a file path, buffer, or a readable stream.

Gzip params:

- opts.zlib - {Object} gzip.FileStream uses zlib to compress, pass this param to control the behavior of zlib.

Tar params:

- opts.relativePath {String} - Adds a file from source into the compressed result file as opts.relativePath. Uncompression programs would extract the file from the compressed file as relativePath. If opts.source is a file path, opts.relativePath is optional, otherwise it's required.
- opts.size {Number} - Tar compression requires the size of file in advance. When opts.source is a stream, the size of it cannot be calculated unless load all content of the stream into memory(the default behavior, but loading all data into memory could be a very bad idea). Pass opts.size to avoid loading all data into memory, or a warning will be shown.
- opts.suppressSizeWarning {Boolean} - Pass true to suppress the size warning mentioned.

Tgz params:

tgz.FileStream is a combination of tar.FileStream and gzip.FileStream, so the params are the combination of params of tar and gzip.

Zip params:

- opts.relativePath {String} - Adds a file from source into the compressed result file as opts.relativePath. Uncompression programs would extract the file from the compressed file as relativePath. If opts.source is a file path, opts.relativePath is optional, otherwise it's required.
- opts.yazl {Object} - zip.FileStream compression uses [yazl](https://github.com/thejoshwolfe/yazl), pass this param to control the behavior of yazl.

### Stream

The readable stream to compress anything as you need.

__Note: If you are not very familiar with streams, just use compressFile() and compressDir() API, error can be handled in one place.__

__Gzip only support compressing a single file. So gzip.Stream is not available.__

__Constructor__

- new tar.Stream()
- new tgz.Stream()
- new zip.Stream()

No options in all constructors.

__Instance methods__

- addEntry(entry, opts)

Params

- entry {String|Buffer|Stream} - entry to compress, cound be a file path, a dir path, a buffer, or a stream.
- opts.relativePath {String} - uncompression programs would extract the file from the compressed file as opts.relativePath. If entry is a file path or a dir path, opts.relativePath is optional, otherwise it's required.
- opts.ignoreBase {Boolean} - when entry is a dir path, and opts.ignoreBase is set to true, the compression will contain files relative to the path passed, and not with the path included.




