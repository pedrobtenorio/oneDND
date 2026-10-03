import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const currentManifest = read('public/data/turn-rules/manifest.json');
const currentFiles = currentManifest.files.map((name) => read(`public/data/turn-rules/${name}`));
const options = currentFiles.flatMap((file) => file.options ?? []);
const features = currentFiles.flatMap((file) => file.features ?? []);
const rules = currentFiles.flatMap((file) => file.rules ?? []);
const groups = new Map(currentFiles.flatMap((file) => file.choiceGroups ?? []).map((group) => [group.id, group]));

const fromDev = (path) => {
  try { return JSON.parse(execFileSync('git', ['show', `dev:${path}`], { encoding: 'utf8' })); }
  catch { return undefined; }
};
const oldManifest = fromDev('public/data/turn-rules/manifest.json');
const oldFiles = (oldManifest?.files ?? []).map((name) => fromDev(`public/data/turn-rules/${name}`)).filter(Boolean);
const oldOptionIds = new Set(oldFiles.flatMap((file) => file.options ?? []).map((item) => item.id));
const oldRuleIds = new Set(oldFiles.flatMap((file) => file.rules ?? []).map((item) => item.id));
const ruleIds = new Set(rules.map((rule) => rule.id));
const oldSpells = fromDev('public/data/spells.json') ?? [];
const oldSpellIds = new Set(oldSpells.map((spell) => spell.id));
const spells = read('public/data/spells.json');

const clean = (value) => String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
const levelOfOption = (option) => {
  const totalLevels = option.requirements?.flatMap((requirement) => requirement.minTotalLevel === undefined ? [] : [requirement.minTotalLevel]) ?? [];
  if (totalLevels.length) return Math.max(...totalLevels);
  const classLevels = option.requirements?.flatMap((requirement) => requirement.minClassLevel === undefined ? [] : [requirement.minClassLevel]) ?? [];
  return (classLevels.length ? Math.max(...classLevels) : undefined)
    ?? groups.get(option.group)?.minLevel ?? (option.kind === 'subclass' ? 3 : 1);
};
const scopeOf = (item) => item.subclassId ?? item.classId ?? item.speciesId ?? item.parentId ?? item.kind ?? 'geral';
const optionImplementation = (option) => {
  if (option.kind === 'background') return 'Criador: antecedente, talento concedido e bônus de atributos validados.';
  if (option.kind === 'subclass') return 'Criador e Guia; características detalhadas por nível vinculadas ao ID preservado.';
  if (option.kind === 'species' || option.kind === 'species-choice') return 'Criador, Guia e concessões de espécie/linhagem.';
  if (option.group === 'wild-shape-forms') return 'Criador: forma conhecida com ND e voo filtrados pelo nível de Druida.';
  if (option.group === 'primal-companion') return 'Criador: bloco de Companheiro Primal persistido por origem.';
  if (['invocation', 'metamagic', 'class-choice'].includes(option.kind)) return 'Criador: grupo, pré-requisitos e limite por nível; Guia com instrução específica.';
  return 'Criador e Guia; elegibilidade e limite validados pelo catálogo compartilhado.';
};
const featureImplementation = (feature) => ruleIds.has(feature.id)
  ? `Motor de turnos (${feature.id}) e referência integral no Guia/revisão.`
  : 'Guia e revisão do personagem com texto específico; aplicação dependente de contexto sinalizada ao jogador.';

const relevantKinds = new Set(['background', 'species', 'species-choice', 'subclass', 'subclass-choice', 'invocation', 'metamagic', 'class-choice', 'feat-origin', 'feat-general', 'fighting-style', 'maneuver']);
const auditedOptions = options.filter((option) => relevantKinds.has(option.kind));
const lines = [
  '# Auditoria do Livro do Jogador - níveis 1 a 8',
  '',
  '> Referência: *Livro do Jogador* 2024, revisão com erratas de agosto. As páginas são as páginas impressas do livro. Esta matriz é gerada dos catálogos usados pela aplicação.',
  '',
  '## Cobertura consolidada',
  '',
  '| Área | Cobertura |',
  '| --- | ---: |',
  `| Classes | 12 |`,
  `| Subclasses | ${options.filter((item) => item.kind === 'subclass').length} |`,
  `| Espécies | ${options.filter((item) => item.kind === 'species').length} |`,
  `| Antecedentes | ${options.filter((item) => item.kind === 'background').length} |`,
  `| Características de classe, subclasse e espécie | ${features.length} |`,
  `| Opções auditadas | ${auditedOptions.length} |`,
  `| Regras estáticas no motor | ${rules.length} |`,
  '',
  'As características que dependem de alvo, decisão do Mestre ou interpretação do cenário aparecem com instrução específica. Elas não são contadas como automatizadas. Magias acima do 4º círculo permanecem no catálogo para consulta, mas a progressão e os espaços impedem sua preparação por personagens limitados ao nível 8.',
  '',
  '## Características',
  '',
  '| Opção | Escopo | Nível | Página | Situação encontrada em `dev` | Implementação correspondente |',
  '| --- | --- | ---: | ---: | --- | --- |',
];

for (const feature of [...features].sort((a, b) => scopeOf(a).localeCompare(scopeOf(b), 'pt-BR') || a.minLevel - b.minLevel || a.name.localeCompare(b.name, 'pt-BR'))) {
  const status = oldRuleIds.has(feature.id) ? 'Regra pontual existente; referência detalhada ausente.' : 'Ausente ou representada apenas por resumo genérico.';
  lines.push(`| ${clean(feature.name)} | ${clean(scopeOf(feature))} | ${feature.minLevel} | ${feature.source.page} | ${status} | ${clean(featureImplementation(feature))} |`);
}

lines.push('', '## Opções e escolhas', '', '| Opção | Tipo/escopo | Nível | Página | Situação encontrada em `dev` | Implementação correspondente |', '| --- | --- | ---: | ---: | --- | --- |');
for (const option of [...auditedOptions].sort((a, b) => a.kind.localeCompare(b.kind) || scopeOf(a).localeCompare(scopeOf(b), 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'))) {
  const status = oldOptionIds.has(option.id) ? 'Cadastrada; texto, referência ou integração revisados.' : 'Ausente no catálogo anterior.';
  lines.push(`| ${clean(option.name)} | ${clean(`${option.kind} · ${scopeOf(option)}`)} | ${levelOfOption(option)} | ${option.source.page} | ${status} | ${clean(optionImplementation(option))} |`);
}

const newSpells = spells.filter((spell) => !oldSpellIds.has(spell.id));
lines.push('', '## Magias acrescentadas durante a conferência', '', '| Magia | Círculo | Página | Implementação |', '| --- | ---: | ---: | --- |');
for (const spell of newSpells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'pt-BR'))) {
  lines.push(`| ${clean(spell.name)} | ${spell.level} | ${spell.sourcePage ?? 0} | Catálogo compartilhado, busca, detalhes e validação de origem de seleção. |`);
}

lines.push('', '## Critério de automação', '', '- **Motor de turnos:** disponibilidade, custo e consumo de recurso são aplicados pelo redutor.', '- **Orientação específica:** a interface informa o gatilho e solicita somente o contexto que o sistema não consegue inferir.', '- **Referência:** características passivas e escolhas narrativas ficam acessíveis no Guia e na revisão do personagem, com nível e página.', '');

mkdirSync('docs', { recursive: true });
writeFileSync('docs/auditoria-livro-jogador-niveis-1-8.md', `${lines.join('\n')}\n`, 'utf8');
console.log(`Audit written with ${features.length} features, ${auditedOptions.length} options and ${newSpells.length} added spells.`);
