import { crc32 } from "node:zlib";

/**
 * A zip file built as it streams, one file at a time, so a few hundred full-size photos never sit in memory together.
 * Files are stored, not compressed: PNGs are already compressed, and storing keeps it fast.
 * Plain zip (not zip64), so the whole archive must stay under 4 GB and 65,535 files; about 800 of our PNGs.
 */
export interface ZipEntry {
  /** Path inside the zip; may contain "/" for folders and any Unicode characters. */
  name: string;
  read: () => Promise<Buffer>;
}

const LIMIT = 0xffffffff;
const UTF8_NAMES = 0x0800;

export function zipStream(entries: ZipEntry[], onError: (err: unknown) => void): ReadableStream<Uint8Array> {
  if (entries.length >= 0xffff) throw new Error("Too many files for one zip");
  const { time, date } = dosDateTime(new Date());
  const central: Buffer[] = [];
  let offset = 0;
  let next = 0;

  return new ReadableStream({
    async pull(controller) {
      try {
        if (next < entries.length) {
          const entry = entries[next++];
          const data = await entry.read();
          const name = Buffer.from(entry.name, "utf8");
          const crc = crc32(data);
          if (offset + 30 + name.length + data.length > LIMIT) throw new Error("Zip would be larger than 4 GB");

          const local = Buffer.alloc(30);
          local.writeUInt32LE(0x04034b50, 0);
          local.writeUInt16LE(20, 4);
          local.writeUInt16LE(UTF8_NAMES, 6);
          local.writeUInt16LE(0, 8); // stored
          local.writeUInt16LE(time, 10);
          local.writeUInt16LE(date, 12);
          local.writeUInt32LE(crc, 14);
          local.writeUInt32LE(data.length, 18);
          local.writeUInt32LE(data.length, 22);
          local.writeUInt16LE(name.length, 26);

          const header = Buffer.alloc(46);
          header.writeUInt32LE(0x02014b50, 0);
          header.writeUInt16LE(20, 4);
          header.writeUInt16LE(20, 6);
          header.writeUInt16LE(UTF8_NAMES, 8);
          header.writeUInt16LE(0, 10);
          header.writeUInt16LE(time, 12);
          header.writeUInt16LE(date, 14);
          header.writeUInt32LE(crc, 16);
          header.writeUInt32LE(data.length, 20);
          header.writeUInt32LE(data.length, 24);
          header.writeUInt16LE(name.length, 28);
          header.writeUInt32LE(offset, 42);
          central.push(header, name);

          controller.enqueue(Buffer.concat([local, name]));
          controller.enqueue(data);
          offset += 30 + name.length + data.length;
          return;
        }
        const directory = Buffer.concat(central);
        const end = Buffer.alloc(22);
        end.writeUInt32LE(0x06054b50, 0);
        end.writeUInt16LE(entries.length, 8);
        end.writeUInt16LE(entries.length, 10);
        end.writeUInt32LE(directory.length, 12);
        end.writeUInt32LE(offset, 16);
        controller.enqueue(Buffer.concat([directory, end]));
        controller.close();
      } catch (err) {
        onError(err);
        controller.error(err);
      }
    },
  });
}

/** Zip timestamps are MS-DOS local time, to 2-second precision. */
function dosDateTime(d: Date) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}
