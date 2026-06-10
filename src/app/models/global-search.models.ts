export type GlobalSearchKind =
  | 'spell'
  | 'guide'
  | 'condition'
  | 'glossary'
  | 'summon'
  | 'weapon'
  | 'weapon-property'
  | 'weapon-mastery';

export type GlobalSearchResult = {
  id: string;
  kind: GlobalSearchKind;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  fragment?: string;
  searchText: string;
};
