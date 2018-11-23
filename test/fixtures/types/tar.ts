import * as compressing from "../../../index";
import * as fs from "fs";

const stringValue = "source";
const streamValue = fs.createWriteStream(stringValue);
const readStreamValue = fs.createReadStream(stringValue);
const numberValue = 1994;
const bufferValue = fs.readFileSync(stringValue);

/*
 * tar.compressFile()
 */
compressing.tar.compressFile(stringValue, stringValue);
compressing.tar.compressFile(stringValue, streamValue);
compressing.tar.compressFile(bufferValue, streamValue, {
  relativePath: stringValue
});
compressing.tar.compressFile(streamValue, streamValue, {
  relativePath: stringValue
});
compressing.tar.compressFile(stringValue, stringValue).then(re => {
});

/*
 * tar.compressDir()
 */
compressing.tar.compressDir(stringValue, stringValue);
compressing.tar.compressDir(stringValue, streamValue);
compressing.tar.compressDir(stringValue, streamValue, {ignoreBase: true});
compressing.tar.compressDir(stringValue, stringValue).then(re => {
});

/*
 * tar.uncompress()
 */
compressing.tar.uncompress(stringValue, stringValue);
compressing.tar.uncompress(stringValue, stringValue, {strip: numberValue});
compressing.tar.uncompress(streamValue, stringValue);
compressing.tar.uncompress(bufferValue, stringValue);
compressing.tar.uncompress(stringValue, stringValue).then(re => {
});
/*
 * tar.FileStream
 */
new compressing.tar.FileStream({relativePath: stringValue});


/**
 * tar.Stream
 */
const ZipStream = compressing.tar.Stream;
let zipStream = new ZipStream();
zipStream.addEntry(stringValue);
zipStream.addEntry(stringValue, {relativePath: stringValue});
zipStream.addEntry(stringValue, {ignoreBase: true});
zipStream.addEntry(stringValue, {relativePath: stringValue, ignoreBase: true});
zipStream.addEntry(bufferValue, {relativePath: stringValue});
zipStream.addEntry(readStreamValue, {relativePath: stringValue, size: numberValue});

/**
 * tar.uncompress_stream
 */
let uncompressStream = new compressing.tar.UncompressStream();
uncompressStream = new compressing.tar.UncompressStream({source: stringValue});
uncompressStream = new compressing.tar.UncompressStream({source: bufferValue});
uncompressStream = new compressing.tar.UncompressStream({source: streamValue});
uncompressStream.on('error', (error) => {
});

