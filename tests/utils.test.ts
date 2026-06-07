import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'bg-red-500', 'px-4');
    // 'px-4' should override 'px-2'
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
    expect(result).toContain('bg-red-500');
    expect(result).not.toContain('px-2');
  });

  it('should handle conditional classes', () => {
    const isTrue = true;
    const isFalse = false;
    const result = cn('base', isTrue && 'truthy', isFalse && 'falsy');
    expect(result).toContain('base');
    expect(result).toContain('truthy');
    expect(result).not.toContain('falsy');
  });
});
