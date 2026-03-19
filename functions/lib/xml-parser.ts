export function parseXML(xml: string): Record<string, unknown> {
  // Remove XML declaration and comments
  xml = xml.replace(/<\?xml[^?]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();

  return parseElement(xml);
}

function parseElement(xml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match;

  while ((match = tagRegex.exec(xml)) !== null) {
    const [, tagName, attrs, content] = match;

    // Check if content has child elements
    if (/<\w+[^>]*>/.test(content)) {
      const parsed = parseElement(content);

      // Handle arrays (multiple elements with same tag name)
      if (result[tagName]) {
        if (Array.isArray(result[tagName])) {
          (result[tagName] as unknown[]).push(parsed);
        } else {
          result[tagName] = [result[tagName], parsed];
        }
      } else {
        result[tagName] = parsed;
      }
    } else {
      // Leaf node — just text content
      if (result[tagName]) {
        if (Array.isArray(result[tagName])) {
          (result[tagName] as string[]).push(content.trim());
        } else {
          result[tagName] = [result[tagName] as string, content.trim()];
        }
      } else {
        result[tagName] = content.trim();
      }
    }
  }

  return result;
}
