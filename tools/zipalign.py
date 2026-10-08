"""Fascinations — zipalign minimal : chaque fichier stocké sans compression commence à un multiple de 4 octets
(Android l'exige pour resources.arsc à partir de l'API 30). Les données compressées sont recopiées telles quelles.
  python3 zipalign.py entrée.apk sortie.apk
  python3 zipalign.py --check fichier.apk"""
import struct
import sys
import zipfile

ALIGN = 4


def local_data_offset(raw, off):
    sig, = struct.unpack_from('<I', raw, off)
    assert sig == 0x04034B50, 'en-tête local inattendu'
    nlen, xlen = struct.unpack_from('<HH', raw, off + 26)
    return off + 30 + nlen + xlen


def check(path):
    raw = open(path, 'rb').read()
    bad = []
    with zipfile.ZipFile(path) as z:
        for i in z.infolist():
            if i.compress_type == zipfile.ZIP_STORED and local_data_offset(raw, i.header_offset) % ALIGN:
                bad.append(i.filename)
    if bad:
        print('non alignés :', ', '.join(bad))
        sys.exit(1)
    print('alignement : correct')


def align(src, dst):
    raw = open(src, 'rb').read()
    out = bytearray()
    central = bytearray()
    with zipfile.ZipFile(src) as z:
        infos = z.infolist()
        for i in infos:
            off = i.header_offset
            (sig, ver, flag, meth, mtime, mdate, crc, csize, usize, nlen, xlen) = struct.unpack_from('<IHHHHHIIIHH', raw, off)
            name = raw[off + 30: off + 30 + nlen]
            data_start = off + 30 + nlen + xlen
            data = raw[data_start: data_start + i.compress_size]
            extra = b''
            if meth == zipfile.ZIP_STORED:
                pad = (ALIGN - (len(out) + 30 + nlen) % ALIGN) % ALIGN
                extra = b'\0' * pad
            new_off = len(out)
            flag &= ~0x08  # pas de descripteur de données : tailles et CRC sont dans l'en-tête
            out += struct.pack('<IHHHHHIIIHH', 0x04034B50, ver, flag, meth, mtime, mdate, i.CRC, i.compress_size, i.file_size, nlen, len(extra))
            out += name + extra + data
            central += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014B50, i.create_version | (i.create_system << 8), ver, flag, meth, mtime, mdate,
                                   i.CRC, i.compress_size, i.file_size, nlen, 0, 0, 0, 0, i.external_attr, new_off)
            central += name
    cd_off = len(out)
    out += central
    out += struct.pack('<IHHHHIIH', 0x06054B50, 0, 0, len(infos), len(infos), len(central), cd_off, 0)
    open(dst, 'wb').write(out)


if __name__ == '__main__':
    if sys.argv[1] == '--check':
        check(sys.argv[2])
    else:
        align(sys.argv[1], sys.argv[2])
        check(sys.argv[2])
