import { describe, it, expect } from 'vitest';
import { parseXML } from '../xml-parser';

describe('parseXML', () => {
  it('parses simple XML', () => {
    const xml = '<root><name>test</name><value>123</value></root>';
    const result = parseXML(xml);
    expect(result.root).toBeDefined();
    const root = result.root as Record<string, unknown>;
    expect(root.name).toBe('test');
    expect(root.value).toBe('123');
  });

  it('parses nested XML', () => {
    const xml = '<root><parent><child>value</child></parent></root>';
    const result = parseXML(xml);
    const root = result.root as Record<string, unknown>;
    const parent = root.parent as Record<string, unknown>;
    expect(parent.child).toBe('value');
  });
});
