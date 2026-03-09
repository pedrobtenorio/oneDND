export type LinkItem = {
  name: string;
  description?: string;
  id?: string;
};

export type LinkPart<T> = {
  text: string;
  linkItem?: T;
  bold?: boolean;
  italic?: boolean;
};

export type LinkIndex<T extends LinkItem> = {
  itemsByKey: Map<string, T>;
  sortedNames: string[];
};

export const normalizeKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildItemAliases = (name: string): string[] => {
  const aliases = new Set<string>([name]);
  const words = name.split(' ');

  const addWordVariants = (input: string): string[] => {
    if (input.endsWith('o')) {
      const root = input.slice(0, -1);
      return [input, `${root}a`, `${root}os`, `${root}as`];
    }
    if (input.endsWith('a')) {
      const root = input.slice(0, -1);
      return [input, `${root}o`, `${root}as`, `${root}os`];
    }
    if (input.endsWith('os')) {
      const root = input.slice(0, -2);
      return [input, `${root}o`];
    }
    if (input.endsWith('as')) {
      const root = input.slice(0, -2);
      return [input, `${root}a`];
    }
    return [input];
  };

  if (words.length === 1) {
    addWordVariants(words[0]).forEach((variant) => aliases.add(variant));
    return Array.from(aliases);
  }

  const firstVariants = addWordVariants(words[0]);
  const lastVariants = addWordVariants(words[words.length - 1]);
  const middle = words.slice(1, -1).join(' ');

  firstVariants.forEach((first) => {
    lastVariants.forEach((last) => {
      const combined = [first, middle, last].filter(Boolean).join(' ');
      aliases.add(combined);
    });
  });

  return Array.from(aliases);
};

export const buildLinkIndex = <T extends LinkItem>(items: T[]): LinkIndex<T> => {
  const itemsByKey = new Map<string, T>();
  const names: string[] = [];

  items.forEach((item) => {
    const aliases = buildItemAliases(item.name);
    aliases.forEach((alias) => {
      const normalized = normalizeKey(alias);
      itemsByKey.set(normalized, item);
      names.push(alias);
    });
  });

  const sortedNames = [...names].sort((a, b) => b.length - a.length);
  return { itemsByKey, sortedNames };
};

type MarkdownSegment = { text: string; bold: boolean; italic: boolean };

const parseMarkdownSegments = (text: string): MarkdownSegment[] => {
  const segments: MarkdownSegment[] = [];
  const mdPattern = /\*\*(.+?)\*\*|\*(.+?)\*/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = mdPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false, italic: false });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true, italic: false });
    } else {
      segments.push({ text: match[2], bold: false, italic: true });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false, italic: false });
  }
  return segments;
};

const buildPartsForSegment = <T extends LinkItem>(
  segment: MarkdownSegment,
  itemsByKey: Map<string, T>,
  pattern: RegExp
): LinkPart<T>[] => {
  const { text, bold, italic } = segment;
  const parts: LinkPart<T>[] = [];
  let lastIndex = 0;
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), bold, italic });
    }
    const normalized = normalizeKey(match[0]);
    parts.push({ text: match[0], linkItem: itemsByKey.get(normalized), bold, italic });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), bold, italic });
  }
  return parts;
};

export const buildDescriptionParts = <T extends LinkItem>(
  description: string,
  items: T[]
): LinkPart<T>[] => {
  const segments = parseMarkdownSegments(description);
  if (!items.length) {
    return segments.map(({ text, bold, italic }) => ({ text, bold, italic }));
  }
  const { itemsByKey, sortedNames } = buildLinkIndex(items);
  const pattern = new RegExp(`\\b(${sortedNames.map(escapeRegex).join('|')})\\b`, 'gi');
  return segments.flatMap((seg) => buildPartsForSegment(seg, itemsByKey, pattern));
};
