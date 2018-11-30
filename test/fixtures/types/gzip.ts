import * as compressing from "../../../index";
import * as fs from "fs";

const stringValue = "source";
const writestreamValue = fs.createWriteStream(stringValue);
const readStreamValue = fs.createReadStream(stringValue);
const numberValue = 1994;
const bufferValue = fs.readFileSync(stringValue);

/*
 * gzip.compressFile()
 */
compressing.gzip.compressFile(stringValue, stringValue);
compressing.gzip.compressFile(stringValue, writestreamValue);
compressing.gzip.compressFile(bufferValue, writestreamValue, {
  relativePath: stringValue
});
compressing.gzip.compressFile(readStreamValue, writestreamValue, {
  relativePath: stringValue
});
compressing.gzip.compressFile(stringValue, stringValue).then(re => {
});

/*
 * gzip.uncompress()
 */
compressing.gzip.uncompress(stringValue, writestreamValue);
compressing.gzip.uncompress(readStreamValue, writestreamValue);
compressing.gzip.uncompress(stringValue, stringValue);
compressing.gzip.uncompress(stringValue, stringValue, {strip: numberValue});
compressing.gzip.uncompress(readStreamValue, stringValue);
compressing.gzip.uncompress(bufferValue, stringValue);
compressing.gzip.uncompress(stringValue, stringValue).then(re => {
});
/*
 * gzip.FileStream
 */
let gzipStream = new compressing.gzip.FileStream();
gzipStream = new compressing.gzip.FileStream({source: stringValue});
gzipStream = new compressing.gzip.FileStream({source: bufferValue});
gzipStream = new compressing.gzip.FileStream({source: readStreamValue});

/**
 * gzip.uncompress_stream
 */
let uncompressStream = new compressing.gzip.UncompressStream();
uncompressStream = new compressing.gzip.UncompressStream({source: stringValue});
uncompressStream = new compressing.gzip.UncompressStream({source: bufferValue});
uncompressStream = new compressing.gzip.UncompressStream({source: readStreamValue});
uncompressStream.on('error', (error) => {
});
