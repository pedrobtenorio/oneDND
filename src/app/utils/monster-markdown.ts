import {
  MonsterEntry,
  MonsterSectionKey,
  MonsterSheet,
  MonsterSpellcastingEntry,
} from '../models/monster.models';
import {
  ABILITY_LABELS,
  calculateAbilityModifier,
  formatModifier,
  formatSpellGroupLabel,
  getMonsterChallenge,
  getMonsterSubtitle,
  MONSTER_SECTION_LABELS,
} from './monster-builder';

const abilityOrder: Array<keyof MonsterSheet['abilities']> = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const sectionOrder: MonsterSectionKey[] = ['traits', 'actions', 'bonusActions', 'reactions'];

export const monsterToMarkdown = (monster: MonsterSheet): string => {
  const lines = [
    `# ${monster.name}`,
    '',
    `_${getMonsterSubtitle(monster)}_`,
    '',
    `- **CA:** ${monster.ac || '-'}`,
    `- **PV:** ${monster.hp || '-'}`,
    `- **Deslocamento:** ${monster.speed || '-'}`,
    `- **Iniciativa:** ${monster.initiative || formatModifier(calculateAbilityModifier(monster.abilities.dex.score))}`,
    '',
    '| Atributo | Valor | Mod | Salvaguarda |',
    '| --- | ---: | ---: | ---: |',
    ...abilityOrder.map((ability) => {
      const score = monster.abilities[ability].score;
      const modifier = formatModifier(calculateAbilityModifier(score));
      const save = monster.abilities[ability].save.trim() || modifier;
      return `| ${ABILITY_LABELS[ability]} | ${score} | ${modifier} | ${save} |`;
    }),
    '',
    `- **Perícias:** ${monster.skills || '-'}`,
    `- **Resistências:** ${monster.resistances || '-'}`,
    `- **Imunidades:** ${monster.immunities || '-'}`,
    `- **Imunidades a Condições:** ${monster.conditionImmunities || '-'}`,
    `- **Sentidos:** ${monster.senses || '-'}`,
    `- **Idiomas:** ${monster.languages || '-'}`,
    `- **Desafio:** ${getMonsterChallenge(monster)}`,
  ];

  for (const section of sectionOrder) {
    const entries = monster[section];
    if (!entries.length) {
      continue;
    }

    lines.push('', `## ${MONSTER_SECTION_LABELS[section]}`, '');
    entries.forEach((entry) => lines.push(...entryToMarkdown(entry), ''));
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
};

const entryToMarkdown = (entry: MonsterEntry): string[] => {
  if (entry.type === 'spellcasting') {
    return spellcastingToMarkdown(entry);
  }

  return [`### ${entry.name}`, describeEntry(entry)];
};

const spellcastingToMarkdown = (entry: MonsterSpellcastingEntry): string[] => {
  const lines = [`### ${entry.name}`];

  if (entry.intro.trim()) {
    lines.push(entry.intro.trim());
  } else {
    const details = [
      entry.saveDc.trim() ? `CD ${entry.saveDc.trim()}` : '',
      entry.spellAttackBonus.trim() ? `${entry.spellAttackBonus.trim()} para ataques mágicos` : '',
    ].filter(Boolean);
    lines.push(
      `A criatura usa ${entry.ability || 'Sabedoria'} como atributo de conjuração${
        details.length ? ` (${details.join(', ')})` : ''
      }.`
    );
  }

  for (const group of entry.spellGroups) {
    const label = formatSpellGroupLabel(group);
    const spells = group.spellIds.length ? group.spellIds.join(', ') : '-';
    lines.push(`- **${label}:** ${spells}`);
  }

  return lines;
};

const describeEntry = (entry: MonsterEntry): string => {
  switch (entry.type) {
    case 'multiattack':
      return entry.routine;
    case 'attack':
      return describeAttack(entry);
    case 'save':
      return describeSave(entry);
    case 'text':
      return entry.description;
    default:
      return '';
  }
};

const describeAttack = (entry: Extract<MonsterEntry, { type: 'attack' }>): string => {
  const attackHeader = [entry.attackBonus, entry.reach, entry.target].filter((value) => value.trim()).join(', ');
  const damage = [
    entry.hitAverage.trim() && entry.hitFormula.trim()
      ? `${entry.hitAverage.trim()} (${entry.hitFormula.trim()})`
      : entry.hitAverage.trim() || (entry.hitFormula.trim() ? `(${entry.hitFormula.trim()})` : ''),
    entry.damageType.trim() ? `de dano ${entry.damageType.trim()}` : '',
    entry.extraDamage.trim(),
  ]
    .filter(Boolean)
    .join(' ');

  return [
    `${entry.attackType || 'Ataque'}${attackHeader ? `: ${attackHeader}.` : '.'}`,
    damage ? `Acerto: ${damage}.` : '',
    entry.effect.trim(),
  ]
    .filter(Boolean)
    .join(' ');
};

const describeSave = (entry: Extract<MonsterEntry, { type: 'save' }>): string =>
  [
    `Salvaguarda de ${entry.saveAbility || 'Atributo'}${entry.dc ? ` CD ${entry.dc}` : ''}${
      entry.target || entry.range ? `, ${[entry.target, entry.range].filter(Boolean).join(', ')}` : ''
    }.`,
    entry.failure.trim() ? `Falha: ${entry.failure.trim()}.` : '',
    entry.success.trim() ? `Sucesso: ${entry.success.trim()}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
