import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const unique = (values, label) => assert(new Set(values).size === values.length, `${label} must be unique`);

const manifest = read('public/data/turn-rules/manifest.json');
assert(manifest.schemaVersion === 1, 'turn-rules manifest schema must be 1');
const files = manifest.files.map((file) => read(`public/data/turn-rules/${file}`));
const options = files.flatMap((file) => file.options ?? []);
const rules = files.flatMap((file) => file.rules ?? []);
unique(options.map((option) => option.id), 'turn option ids');
unique(rules.map((rule) => rule.id), 'static turn rule ids');
const classIds = ['barbaro', 'bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro', 'guardiao', 'guerreiro', 'ladino', 'mago', 'monge', 'paladino'];
const subclasses = options.filter((option) => option.kind === 'subclass');
assert(subclasses.length === 48, `expected 48 subclasses, got ${subclasses.length}`);
for (const classId of classIds) {
  assert(subclasses.filter((option) => option.parentId === classId).length === 4, `${classId} must have four subclasses`);
}
for (const entry of [...options, ...rules]) {
  assert(entry.source?.book === 'Livro do Jogador', `${entry.id} lacks book provenance`);
  assert(Number.isInteger(entry.source?.page) && entry.source.page > 0, `${entry.id} lacks a printed page`);
}

const expectedGeneralFeats = [
  'Adepto Elemental', 'Agressor', 'Analítico', 'Atirador Arcano', 'Atleta', 'Ator',
  'Aumento no Valor de Atributo', 'Chef', 'Combatente Montado', 'Conjurador Bélico',
  'Conjurador Ritualista', 'Duelista Defensivo', 'Envenenador', 'Esmagador',
  'Especialista Ambidestro', 'Especialista em Armaduras Leves', 'Especialista em Armaduras Médias',
  'Especialista em Armaduras Pesadas', 'Especialista em Besta', 'Especialista em Perícia',
  'Exterminador de Conjuradores', 'Imobilizador', 'Líder Inspirador', 'Mente Aguçada',
  'Mestre das Armas', 'Mestre em Armaduras Médias', 'Mestre em Armaduras Pesadas',
  'Mestre em Armas de Haste', 'Mestre em Armas Grandes', 'Mestre em Escudos', 'Mestre-Atirador',
  'Perfurador', 'Resiliente', 'Resistente', 'Sentinela', 'Sorrateiro', 'Talhador',
  'Telecinético', 'Telepático', 'Tocado pela Sombra', 'Tocado pelas Fadas',
  'Treinamento com Armas Marciais', 'Velocista',
];
const generalFeats = options.filter((option) => option.kind === 'feat-general');
assert(generalFeats.length === expectedGeneralFeats.length, `expected ${expectedGeneralFeats.length} general feats, got ${generalFeats.length}`);
assert(expectedGeneralFeats.every((name) => generalFeats.some((feat) => feat.name === name)), 'general feat catalog diverges from Player Handbook pages 199-200');

const expectedOriginFeatIds = [
  'alerta', 'artesao', 'atacante-selvagem', 'curandeiro', 'habilidoso',
  'iniciado-em-magia-clerigo', 'iniciado-em-magia-druida', 'iniciado-em-magia-mago',
  'musico', 'sortudo', 'brigao-de-taverna', 'vigoroso',
];
const originFeats = options.filter((option) => option.kind === 'feat-origin');
assert(originFeats.length === expectedOriginFeatIds.length, `expected ${expectedOriginFeatIds.length} selectable origin feat variants, got ${originFeats.length}`);
assert(expectedOriginFeatIds.every((id) => originFeats.some((feat) => feat.id === id)), 'origin feat catalog diverges from Player Handbook pages 199-200');

const expectedFightingStyles = [
  'Arqueria', 'Combate com Armas de Arremesso', 'Combate com Armas Grandes',
  'Combate com Duas Armas', 'Combate Desarmado', 'Defensivo', 'Duelismo',
  'Interceptação', 'Luta às Cegas', 'Protetivo',
];
const fightingStyles = options.filter((option) => option.kind === 'fighting-style');
assert(expectedFightingStyles.every((name) => fightingStyles.some((style) => style.name === name)), 'fighting style catalog diverges from Player Handbook pages 199-200');

const weapons = read('public/data/weapons.json');
const weaponEntries = weapons.categories.flatMap((category) => category.weapons);
assert(weaponEntries.length === 38, `expected 38 weapons, got ${weaponEntries.length}`);
assert(weapons.properties.length === 10, `expected 10 weapon properties, got ${weapons.properties.length}`);
assert(weapons.masteryProperties.length === 8, `expected 8 masteries, got ${weapons.masteryProperties.length}`);
unique([
  ...weaponEntries.map((item) => item.id),
  ...weapons.properties.map((item) => item.id),
  ...weapons.masteryProperties.map((item) => item.id),
], 'weapon catalog ids');
const masteryNames = new Set(weapons.masteryProperties.map((item) => item.name));
for (const weapon of weaponEntries) assert(masteryNames.has(weapon.mastery), `${weapon.id} references unknown mastery ${weapon.mastery}`);

const guide = read('public/data/guide.json');
const guideById = new Map(guide.map((category) => [category.id, category]));
const expectedActions = new Map([
  ['acao-dash', 'Correr'], ['acao-magic', 'Usar Magia'], ['acao-study', 'Analisar'], ['acao-utilize', 'Usar Objeto'],
]);
const actionItems = guideById.get('acoes-combate')?.items ?? [];
for (const [id, name] of expectedActions) assert(actionItems.some((item) => item.id === id && item.name === name), `${id} must be named ${name}`);
const sameNames = (left, right) => left.length === right.length && left.every((name) => right.includes(name));
assert(sameNames(weapons.properties.map((item) => item.name), guideById.get('propriedades-armas').items.map((item) => item.name)), 'weapon properties diverge between guide and canonical catalog');
assert(sameNames(weapons.masteryProperties.map((item) => item.name), guideById.get('propriedades-maestria').items.map((item) => item.name)), 'weapon masteries diverge between guide and canonical catalog');

const spells = read('public/data/spells.json');
for (const className of ['Bardo', 'Bruxo', 'Clérigo', 'Druida', 'Feiticeiro', 'Guardião', 'Mago', 'Paladino']) {
  assert(spells.some((spell) => spell.classes.includes(className)), `${className} lacks spells in the shared catalog`);
}
const guardianSpells = spells.filter((spell) => spell.level >= 1 && spell.level <= 2 && spell.classes.includes('Guardião'));
assert(guardianSpells.length === 32, `expected 32 Guardian spells, got ${guardianSpells.length}`);
unique(spells.map((spell) => spell.id), 'spell ids');

console.log(`Turn data valid: ${rules.length} static rules, ${options.length} options, ${subclasses.length} subclasses, ${weaponEntries.length} weapons, ${guardianSpells.length} Guardian spells.`);
