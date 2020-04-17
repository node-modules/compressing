import * as compressing from "../../../index";
import * as fs from "fs";

const stringValue = "source";
const writestreamValue = fs.createWriteStream(stringValue);
const readStreamValue = fs.createReadStream(stringValue);
const numberValue = 1994;
const bufferValue = fs.readFileSync(stringValue);

/*
 * zip.compressFile()
 */
compressing.zip.compressFile(stringValue, stringValue);
compressing.zip.compressFile(stringValue, writestreamValue);
compressing.zip.compressFile(bufferValue, writestreamValue, {
  relativePath: stringValue
});
compressing.zip.compressFile(readStreamValue, writestreamValue, {
  relativePath: stringValue
});
compressing.zip.compressFile(stringValue, stringValue).then(re => {
});

/*
 * zip.compressDir()
 */
compressing.zip.compressDir(stringValue, stringValue);
compressing.zip.compressDir(bufferValue, stringValue);
compressing.zip.compressDir(readStreamValue, stringValue);
compressing.zip.compressDir(stringValue, writestreamValue);
compressing.zip.compressDir(stringValue, writestreamValue, { ignoreBase: true });
compressing.zip.compressDir(stringValue, stringValue).then(re => {
});

/*
 * zip.uncompress()
 */
compressing.zip.uncompress(stringValue, stringValue);
compressing.zip.uncompress(stringValue, stringValue, { strip: numberValue });
compressing.zip.uncompress(readStreamValue, stringValue);
compressing.zip.uncompress(bufferValue, stringValue);
compressing.zip.uncompress(stringValue, stringValue).then(re => {
});
/*
 * zip.FileStream
 */
new compressing.zip.FileStream({ relativePath: stringValue });


/**
 * zip.Stream
 */
const ZipStream = compressing.zip.Stream;
let zipStream = new ZipStream();
zipStream.addEntry(stringValue);
zipStream.addEntry(stringValue, { relativePath: stringValue });
zipStream.addEntry(stringValue, { ignoreBase: true });
zipStream.addEntry(stringValue, { relativePath: stringValue, ignoreBase: true });
zipStream.addEntry(bufferValue, { relativePath: stringValue });
zipStream.addEntry(readStreamValue, { relativePath: stringValue, size: numberValue });

/**
 * zip.uncompress_stream
 */
let uncompressStream = new compressing.zip.UncompressStream();
uncompressStream = new compressing.zip.UncompressStream({ source: stringValue });
uncompressStream = new compressing.zip.UncompressStream({ source: bufferValue });
uncompressStream = new compressing.zip.UncompressStream({ source: readStreamValue });
uncompressStream = new compressing.zip.UncompressStream({ strip: numberValue });
uncompressStream.on('entry', (header, stream: fs.ReadStream, next) => {
  stream.resume()
});
uncompressStream.on('error', (error) => {
});
uncompressStream.on('finish', () => {
});
