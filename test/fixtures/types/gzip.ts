import * as compressing from "../../../index";
import * as fs from "fs";

const stringValue = "source";
const streamValue = fs.createWriteStream(stringValue);
const numberValue = 1994;
const bufferValue = fs.readFileSync(stringValue);

/*
 * gzip.compressFile()
 */
compressing.gzip.compressFile(stringValue, stringValue);
compressing.gzip.compressFile(stringValue, streamValue);
compressing.gzip.compressFile(bufferValue, streamValue, {
  relativePath: stringValue
});
compressing.gzip.compressFile(streamValue, streamValue, {
  relativePath: stringValue
});
compressing.gzip.compressFile(stringValue, stringValue).then(re => {
});

/*
 * gzip.uncompress()
 */
compressing.gzip.uncompress(stringValue, streamValue);
compressing.gzip.uncompress(streamValue, streamValue);
compressing.gzip.uncompress(stringValue, stringValue);
compressing.gzip.uncompress(stringValue, stringValue, {strip: numberValue});
compressing.gzip.uncompress(streamValue, stringValue);
compressing.gzip.uncompress(bufferValue, stringValue);
compressing.gzip.uncompress(stringValue, stringValue).then(re => {
});
/*
 * gzip.FileStream
 */
let gzipStream = new compressing.gzip.FileStream();
gzipStream = new compressing.gzip.FileStream({source: stringValue});
gzipStream = new compressing.gzip.FileStream({source: bufferValue});
gzipStream = new compressing.gzip.FileStream({source: streamValue});

/**
 * gzip.uncompress_stream
 */
let uncompressStream = new compressing.gzip.UncompressStream();
uncompressStream = new compressing.gzip.UncompressStream({source: stringValue});
uncompressStream = new compressing.gzip.UncompressStream({source: bufferValue});
uncompressStream = new compressing.gzip.UncompressStream({source: streamValue});
uncompressStream.on('error', (error) => {
});
