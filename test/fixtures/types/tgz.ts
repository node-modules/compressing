import * as compressing from "../../../index";
import * as fs from "fs";

const stringValue = "source";
const streamValue = fs.createWriteStream(stringValue);
const readStreamValue = fs.createReadStream(stringValue);
const numberValue = 1994;
const bufferValue = fs.readFileSync(stringValue);

/*
 * tgz.compressFile()
 */
compressing.tgz.compressFile(stringValue, stringValue);
compressing.tgz.compressFile(stringValue, streamValue);
compressing.tgz.compressFile(bufferValue, streamValue, {
  relativePath: stringValue
});
compressing.tgz.compressFile(streamValue, streamValue, {
  relativePath: stringValue
});
compressing.tgz.compressFile(stringValue, stringValue).then(re => {
});

/*
 * tgz.compressDir()
 */
compressing.tgz.compressDir(stringValue, stringValue);
compressing.tgz.compressDir(stringValue, streamValue);
compressing.tgz.compressDir(stringValue, streamValue, {ignoreBase: true});
compressing.tgz.compressDir(stringValue, stringValue).then(re => {
});

/*
 * tgz.uncompress()
 */
compressing.tgz.uncompress(stringValue, stringValue);
compressing.tgz.uncompress(stringValue, stringValue, {strip: 1});
compressing.tgz.uncompress(streamValue, stringValue);
compressing.tgz.uncompress(bufferValue, stringValue);
compressing.tgz.uncompress(stringValue, stringValue).then(re => {
});
/*
 * tgz.FileStream
 */
new compressing.tgz.FileStream({relativePath: stringValue});

/**
 * tgz.Stream
 */
const ZipStream = compressing.tgz.Stream;
let zipStream = new ZipStream();
zipStream.addEntry(stringValue);
zipStream.addEntry(stringValue, {relativePath: stringValue});
zipStream.addEntry(stringValue, {ignoreBase: true});
zipStream.addEntry(stringValue, {relativePath: stringValue, ignoreBase: true});
zipStream.addEntry(bufferValue, {relativePath: stringValue});
zipStream.addEntry(readStreamValue, {relativePath: stringValue, size: numberValue});

/**
 * tgz.uncompress_stream
 */
let uncompressStream = new compressing.tgz.UncompressStream();
uncompressStream = new compressing.tgz.UncompressStream({source: stringValue});
uncompressStream = new compressing.tgz.UncompressStream({source: bufferValue});
uncompressStream = new compressing.tgz.UncompressStream({source: streamValue});
uncompressStream = new compressing.tgz.UncompressStream({strip: numberValue});
uncompressStream.on('finish', () => {
});
uncompressStream.on('entry', (header, stream, next) => {
});
uncompressStream.on('error', (error) => {
});
