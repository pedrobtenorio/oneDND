export type LinkItem = {
  name: string;
  description?: string;
  id?: string;
};

export type LinkPart<T> = {
  text: string;
  linkItem?: T;
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

export const buildDescriptionParts = <T extends LinkItem>(
  description: string,
  items: T[]
): LinkPart<T>[] => {
  if (!items.length) {
    return [{ text: description }];
  }

  const { itemsByKey, sortedNames } = buildLinkIndex(items);
  const pattern = new RegExp(`\\b(${sortedNames.map(escapeRegex).join('|')})\\b`, 'gi');
  const parts: LinkPart<T>[] = [];
  let lastIndex = 0;
  let match = pattern.exec(description);

  while (match) {
    if (match.index > lastIndex) {
      parts.push({ text: description.slice(lastIndex, match.index) });
    }

    const matchedText = match[0];
    const normalized = normalizeKey(matchedText);
    parts.push({ text: matchedText, linkItem: itemsByKey.get(normalized) });

    lastIndex = match.index + matchedText.length;
    match = pattern.exec(description);
  }

  if (lastIndex < description.length) {
    parts.push({ text: description.slice(lastIndex) });
  }

  return parts;
};
