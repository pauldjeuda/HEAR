export interface ParsedAudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artworkBlob?: Blob;
  artworkUrl?: string;
}

function decodeText(bytes: Uint8Array, encoding: number): string {
  try {
    if (encoding === 0) {
      // ISO-8859-1
      return new TextDecoder('iso-8859-1').decode(bytes).replace(/\0+$/, '').trim();
    }
    if (encoding === 1) {
      // UTF-16 with BOM
      return new TextDecoder('utf-16').decode(bytes).replace(/\0+$/, '').trim();
    }
    if (encoding === 2) {
      // UTF-16BE without BOM
      return new TextDecoder('utf-16be').decode(bytes).replace(/\0+$/, '').trim();
    }
    if (encoding === 3) {
      // UTF-8
      return new TextDecoder('utf-8').decode(bytes).replace(/\0+$/, '').trim();
    }
  } catch {
    // fallback
  }
  return new TextDecoder().decode(bytes).replace(/\0+$/, '').trim();
}

export async function parseAudioFileMetadata(file: Blob): Promise<ParsedAudioMetadata> {
  const result: ParsedAudioMetadata = {};
  try {
    const headerBuffer = await file.slice(0, 10).arrayBuffer();
    const headerView = new DataView(headerBuffer);

    // ID3v2 tag check
    if (
      headerView.getUint8(0) === 0x49 && // 'I'
      headerView.getUint8(1) === 0x44 && // 'D'
      headerView.getUint8(2) === 0x33 // '3'
    ) {
      const version = headerView.getUint8(3);
      const tagSize =
        ((headerView.getUint8(6) & 0x7f) << 21) |
        ((headerView.getUint8(7) & 0x7f) << 14) |
        ((headerView.getUint8(8) & 0x7f) << 7) |
        (headerView.getUint8(9) & 0x7f);

      const maxRead = Math.min(tagSize + 10, Math.min(file.size, 10 * 1024 * 1024));
      const fullTagBuffer = await file.slice(10, maxRead).arrayBuffer();
      const tagBytes = new Uint8Array(fullTagBuffer);
      const tagDataView = new DataView(fullTagBuffer);

      let offset = 0;
      while (offset + 10 < tagBytes.length) {
        let frameId = '';
        for (let i = 0; i < 4; i++) {
          frameId += String.fromCharCode(tagBytes[offset + i]);
        }
        if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

        let frameSize = 0;
        if (version === 4) {
          frameSize =
            ((tagDataView.getUint8(offset + 4) & 0x7f) << 21) |
            ((tagDataView.getUint8(offset + 5) & 0x7f) << 14) |
            ((tagDataView.getUint8(offset + 6) & 0x7f) << 7) |
            (tagDataView.getUint8(offset + 7) & 0x7f);
        } else {
          frameSize = tagDataView.getUint32(offset + 4);
        }

        if (frameSize <= 0 || offset + 10 + frameSize > tagBytes.length) break;

        const frameData = tagBytes.subarray(offset + 10, offset + 10 + frameSize);

        if (frameId === 'TIT2' && !result.title) {
          result.title = decodeText(frameData.subarray(1), frameData[0]);
        } else if (frameId === 'TPE1' && !result.artist) {
          result.artist = decodeText(frameData.subarray(1), frameData[0]);
        } else if (frameId === 'TALB' && !result.album) {
          result.album = decodeText(frameData.subarray(1), frameData[0]);
        } else if (frameId === 'APIC' && !result.artworkBlob) {
          const encoding = frameData[0];
          let mimeEnd = 1;
          while (mimeEnd < frameData.length && frameData[mimeEnd] !== 0) {
            mimeEnd++;
          }
          const mimeType = new TextDecoder('iso-8859-1')
            .decode(frameData.subarray(1, mimeEnd))
            .toLowerCase();
          // skip picture type byte
          const descStart = mimeEnd + 2;
          let descEnd = descStart;
          if (encoding === 1 || encoding === 2) {
            // 2-byte null terminator
            while (
              descEnd + 1 < frameData.length &&
              !(frameData[descEnd] === 0 && frameData[descEnd + 1] === 0)
            ) {
              descEnd += 2;
            }
            descEnd += 2;
          } else {
            // 1-byte null terminator
            while (descEnd < frameData.length && frameData[descEnd] !== 0) {
              descEnd++;
            }
            descEnd += 1;
          }

          if (descEnd < frameData.length) {
            const imageBytes = frameData.subarray(descEnd);
            const safeMime = mimeType.includes('/') ? mimeType : 'image/jpeg';
            result.artworkBlob = new Blob([imageBytes], { type: safeMime });
            result.artworkUrl = URL.createObjectURL(result.artworkBlob);
          }
        }

        offset += 10 + frameSize;
      }
    } else if (
      headerView.getUint8(0) === 0x66 && // 'f'
      headerView.getUint8(1) === 0x4c && // 'L'
      headerView.getUint8(2) === 0x61 && // 'a'
      headerView.getUint8(3) === 0x43 // 'C'
    ) {
      // FLAC file
      const flacBuffer = await file.slice(4, Math.min(file.size, 5 * 1024 * 1024)).arrayBuffer();
      const flacBytes = new Uint8Array(flacBuffer);
      const flacView = new DataView(flacBuffer);
      let offset = 0;
      let isLast = false;

      while (!isLast && offset + 4 <= flacBytes.length) {
        const header = flacView.getUint8(offset);
        isLast = (header & 0x80) !== 0;
        const blockType = header & 0x7f;
        const blockLength =
          (flacView.getUint8(offset + 1) << 16) |
          (flacView.getUint8(offset + 2) << 8) |
          flacView.getUint8(offset + 3);

        const dataOffset = offset + 4;
        if (dataOffset + blockLength > flacBytes.length) break;

        // Block type 6 = PICTURE
        if (blockType === 6 && !result.artworkBlob) {
          const picView = new DataView(flacBuffer, dataOffset, blockLength);
          const mimeLength = picView.getUint32(4);
          let pOffset = 8;
          const mimeBytes = flacBytes.subarray(
            dataOffset + pOffset,
            dataOffset + pOffset + mimeLength,
          );
          const mime = new TextDecoder('ascii').decode(mimeBytes);
          pOffset += mimeLength;

          const descLength = picView.getUint32(pOffset);
          pOffset += 4 + descLength;
          pOffset += 16; // width, height, color depth, colors count

          const dataLength = picView.getUint32(pOffset);
          pOffset += 4;

          const imgData = flacBytes.subarray(
            dataOffset + pOffset,
            dataOffset + pOffset + dataLength,
          );
          result.artworkBlob = new Blob([imgData], { type: mime || 'image/jpeg' });
          result.artworkUrl = URL.createObjectURL(result.artworkBlob);
        }

        offset = dataOffset + blockLength;
      }
    }
  } catch {
    // Graceful fallback on parsing error
  }
  return result;
}
