import { describe, expect, it } from 'vitest';
import { detectPrivateFile, sanitizeOriginalFilename } from './private-file.service';

describe('private file signature validation', () => {
  it('accepts PDF, PNG, and JPEG signatures and rejects disguised text', () => {
    expect(detectPrivateFile(Buffer.from('%PDF-1.7\n'))).toEqual({
      mime: 'application/pdf',
      extension: 'pdf',
    });
    expect(detectPrivateFile(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toEqual({
      mime: 'image/png',
      extension: 'png',
    });
    expect(detectPrivateFile(Buffer.from([255, 216, 255, 224]))).toEqual({
      mime: 'image/jpeg',
      extension: 'jpg',
    });
    expect(() => detectPrivateFile(Buffer.from('<script>alert(1)</script>'))).toThrow();
  });

  it('removes path, header, and HTML metacharacters from displayed filenames', () => {
    const filename = sanitizeOriginalFilename('../<script>alert(1)</script>\r\n".pdf', 'pdf');
    expect(filename).not.toMatch(/[\u0000-\u001f\u007f<>:&"\\/]/);
    expect(filename.endsWith('.pdf')).toBe(true);
    expect(sanitizeOriginalFilename('', 'png')).toBe('berkas.png');
  });
});
