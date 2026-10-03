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
const features = files.flatMap((file) => file.features ?? []);
const choiceGroups = files.flatMap((file) => file.choiceGroups ?? []);
const spellGrants = files.flatMap((file) => file.spellGrants ?? []);
unique(options.map((option) => option.id), 'turn option ids');
unique(rules.map((rule) => rule.id), 'static turn rule ids');
unique(features.map((feature) => feature.id), 'character feature ids');
unique(choiceGroups.map((group) => group.id), 'character choice group ids');
const classIds = ['barbaro', 'bardo', 'bruxo', 'clerigo', 'druida', 'feiticeiro', 'guardiao', 'guerreiro', 'ladino', 'mago', 'monge', 'paladino'];
const subclasses = options.filter((option) => option.kind === 'subclass');
assert(subclasses.length === 48, `expected 48 subclasses, got ${subclasses.length}`);
for (const classId of classIds) {
  assert(subclasses.filter((option) => option.parentId === classId).length === 4, `${classId} must have four subclasses`);
}
for (const entry of [...options, ...rules, ...features]) {
  assert(entry.source?.book === 'Livro do Jogador', `${entry.id} lacks book provenance`);
  assert(Number.isInteger(entry.source?.page) && entry.source.page > 0, `${entry.id} lacks a printed page`);
}

assert(features.length >= 250, `expected detailed level 1-8 features, got ${features.length}`);
for (const feature of features) assert(Number.isInteger(feature.minLevel) && feature.minLevel >= 1 && feature.minLevel <= 8, `${feature.id} is outside the level 1-8 audit`);
for (const classId of classIds) {
  assert(features.some((feature) => feature.classId === classId && feature.minLevel <= 8), `${classId} lacks audited features through level 8`);
}
for (const subclass of subclasses) {
  const expectedLevels = subclass.parentId === 'ladino' ? [3]
    : ['guardiao', 'guerreiro', 'paladino'].includes(subclass.parentId) ? [3, 7] : [3, 6];
  const actualLevels = new Set(features.filter((feature) => feature.subclassId === subclass.id).map((feature) => feature.minLevel));
  assert(expectedLevels.every((level) => actualLevels.has(level)), `${subclass.id} lacks a detailed feature at ${expectedLevels.join(' and ')}`);
}
const species = options.filter((option) => option.kind === 'species');
assert(species.length === 10, `expected 10 species, got ${species.length}`);
for (const entry of species) assert(features.some((feature) => feature.speciesId === entry.id), `${entry.id} lacks an audited species feature`);

const groupIds = new Set(choiceGroups.map((group) => group.id));
for (const group of choiceGroups) {
  assert(classIds.includes(group.classId), `${group.id} references unknown class ${group.classId}`);
  assert(Number.isInteger(group.minLevel) && group.minLevel >= 1 && group.minLevel <= 8, `${group.id} has an invalid minimum level`);
  assert(group.limits.length === 9 && group.limits.every(Number.isInteger), `${group.id} must define limits from level 0 through 8`);
  if (group.subclassId) assert(subclasses.some((subclass) => subclass.id === group.subclassId), `${group.id} references unknown subclass ${group.subclassId}`);
}
for (const option of options.filter((entry) => ['class-choice', 'invocation', 'metamagic'].includes(entry.kind))) {
  assert(groupIds.has(option.group), `${option.id} references unknown choice group ${option.group}`);
}
for (const group of choiceGroups) assert(options.filter((option) => option.group === group.id).length >= Math.max(...group.limits), `${group.id} has fewer options than its highest limit`);
const wildShapes = options.filter((option) => option.group === 'wild-shape-forms');
assert(wildShapes.length === 42, `expected 42 Player Handbook beast forms, got ${wildShapes.length}`);
assert(wildShapes.every((option) => typeof option.beastCr === 'number' && option.beastCr <= 1), 'wild shape entries must carry challenge ratings through level 8');
assert(options.filter((option) => option.group === 'primal-companion').length === 3, 'Beast Master must offer the three Primal Companion stat blocks');

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
  'Telecinético', 'Telepático', 'Tocado Pelas Sombras', 'Tocado Por Fadas',
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
assert(originFeats.find((feat) => feat.id === 'habilidoso')?.repeatable === true, 'Habilidoso must be repeatable');
const repeatableGeneralFeatIds = ['aumento-no-valor-de-atributo', 'adepto-elemental'];
assert(generalFeats.filter((feat) => feat.repeatable).every((feat) => repeatableGeneralFeatIds.includes(feat.id)), 'only ASI and Elemental Adept are repeatable general feats through level 8');
assert(repeatableGeneralFeatIds.every((id) => generalFeats.find((feat) => feat.id === id)?.repeatable === true), 'repeatable general feats are incomplete');
const mageSlayer = generalFeats.find((feat) => feat.id === 'matador-de-magos');
assert(mageSlayer?.abilityPoints === 1 && mageSlayer.abilityOptions?.join(',') === 'strength,dexterity', 'Exterminador de Conjuradores must grant +1 Strength or Dexterity');
const backgrounds = options.filter((option) => option.kind === 'background');
assert(backgrounds.length === 16, `expected 16 backgrounds, got ${backgrounds.length}`);
for (const background of backgrounds) {
  assert(background.abilityOptions?.length === 3 && background.abilityPoints === 3, `${background.id} lacks its three-point ability allocation`);
  assert(originFeats.some((feat) => feat.id === background.grantedFeatId), `${background.id} grants unknown origin feat ${background.grantedFeatId}`);
}

const expectedFightingStyles = [
  'Arquearia', 'Combate com Armas de Arremesso', 'Combate com Armas Grandes',
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
const spellIds = new Set(spells.map((spell) => spell.id));
for (const grant of spellGrants) {
  assert(classIds.includes(grant.classId), `spell grant references unknown class ${grant.classId}`);
  assert(Number.isInteger(grant.minLevel) && grant.minLevel >= 1 && grant.minLevel <= 8, `spell grant for ${grant.classId} has invalid level ${grant.minLevel}`);
  if (grant.subclassId) assert(subclasses.some((subclass) => subclass.id === grant.subclassId), `spell grant references unknown subclass ${grant.subclassId}`);
  assert(grant.spellIds.length > 0 && grant.spellIds.every((id) => spellIds.has(id)), `spell grant for ${grant.subclassId ?? grant.classId} contains an unknown spell`);
}
for (const className of ['Bardo', 'Bruxo', 'Clérigo', 'Druida', 'Feiticeiro', 'Guardião', 'Mago', 'Paladino']) {
  assert(spells.some((spell) => spell.classes.includes(className)), `${className} lacks spells in the shared catalog`);
}
const guardianSpells = spells.filter((spell) => spell.level >= 1 && spell.level <= 2 && spell.classes.includes('Guardião'));
assert(guardianSpells.length === 32, `expected 32 Guardian spells, got ${guardianSpells.length}`);
unique(spells.map((spell) => spell.id), 'spell ids');

console.log(`Turn data valid: ${rules.length} static rules, ${options.length} options, ${features.length} level 1-8 features, ${subclasses.length} subclasses, ${species.length} species, ${backgrounds.length} backgrounds, ${spellGrants.length} automatic spell grants, ${weaponEntries.length} weapons, ${guardianSpells.length} Guardian spells.`);
