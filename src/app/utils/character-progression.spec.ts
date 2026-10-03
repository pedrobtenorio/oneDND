import { CharacterProfile, TurnClassId } from '../models/turn-planner.models';
import { attackCount, buildInitialResources, recoverResources, validateProfile } from './turn-engine/turn-profile';
import { cantripLimit, featLevels, maxSpellCircle, preparedLimit, spellSlots } from './character-progression';
import { eligibleChoice, finalAbilities, spellFitsGrant, spellSelectionGrants, validateBonuses } from './character-choices';
import { Spell } from '../models/spell.models';

const character = (id: TurnClassId = 'mago', level = 8): CharacterProfile => ({
  id:'test',name:'Teste',speciesId:'humano',classes:[{classId:id,level,order:0}],
  abilities:{strength:14,dexterity:14,constitution:14,intelligence:14,wisdom:14,charisma:14},
  subclassIds:[],featIds:[],fightingStyleIds:[],maneuverIds:[],preparedSpellIds:[],weaponIds:[],masteryWeaponIds:[],masteryIds:[],armor:'none',hasShield:false,speed:9,updatedAt:'',
});

describe('Player Handbook progression through level 8', () => {
  const ids: TurnClassId[] = ['barbaro','bardo','bruxo','clerigo','druida','feiticeiro','guardiao','guerreiro','ladino','mago','monge','paladino'];
  for (const id of ids) for (let level = 1; level <= 8; level++) {
    it(`accepts ${id} ${level} without invalid resource pools`, () => {
      const p = character(id,level);
      expect(validateProfile(p)).toEqual([]);
      for (const pool of Object.values(buildInitialResources(p))) {
        expect(Number.isInteger(pool.max)).toBeTrue();
        expect(pool.current).toBe(pool.max);
        expect(pool.max).toBeGreaterThan(0);
      }
    });
  }
  it('uses individual half and third caster tables, not the multiclass table', () => {
    expect(spellSlots(character('paladino',2))).toEqual([2]);
    expect(spellSlots(character('guardiao',7))).toEqual([4,3]);
    expect(spellSlots({...character('guerreiro',6),subclassIds:['cavaleiro-mistico']})).toEqual([3]);
    expect(spellSlots({...character('ladino',7),subclassIds:['trapaceiro-arcano']})).toEqual([4,2]);
  });
  it('grants fourth-circle slots at full caster 7 and 8 and pact 7', () => {
    expect(spellSlots(character('mago',7))).toEqual([4,3,3,1]);
    expect(spellSlots(character('clerigo',8))).toEqual([4,3,3,2]);
    expect(buildInitialResources(character('bruxo',7))['pact-slot-4'].max).toBe(2);
    expect(buildInitialResources(character('bruxo',7))['spell-slot-4']).toBeUndefined();
  });
  it('keeps multiclass spell selections separate from combined slot levels', () => {
    const p = {...character(),classes:[{classId:'mago' as const,level:4,order:0},{classId:'clerigo' as const,level:4,order:1}]};
    expect(spellSlots(p)).toEqual([4,3,3,2]);
    const grants = spellSelectionGrants(p).filter(g => g.id.startsWith('class.'));
    expect(grants.map(g => g.limit)).toEqual([7,7]);
    expect(grants.every(g => g.maxCircle === 2)).toBeTrue();
    const fireball: Spell = {id:'bola-de-fogo',name:'Bola de Fogo',level:3,classes:['Mago','Feiticeiro'],school:'Evocação',castingTime:'Ação',components:['V'],range:'45 metros',duration:'Instantânea',description:''};
    expect(grants.some(g => spellFitsGrant(fireball,g))).toBeFalse();
  });
  it('tracks a Wizard spellbook separately from prepared spells and Savant additions', () => {
    const p = {...character('mago',7),subclassIds:['evocador']};
    const grants = spellSelectionGrants(p);
    expect(grants.filter(grant => grant.id.startsWith('book.mago.')).map(grant => grant.limit)).toEqual([6,2,2,2,2,2,2]);
    expect(grants.filter(grant => grant.id.startsWith('book.savant.')).map(grant => grant.limit)).toEqual([2,1,1]);
    expect(grants.find(grant => grant.id === 'class.mago')?.limit).toBe(11);
  });
  it('applies Wild Shape challenge-rating and flight limits at levels 2, 4 and 8', () => {
    const wolf = {id:'beast.lobo',name:'Lobo',kind:'class-choice' as const,group:'wild-shape-forms',summary:'',beastCr:.25,source:{book:'Livro do Jogador',revision:'2024',page:354}};
    const bear = {...wolf,id:'beast.urso-pardo',name:'Urso Pardo',beastCr:1};
    const owl = {...wolf,id:'beast.coruja',name:'Coruja',beastCr:0,flies:true};
    expect(eligibleChoice(wolf,character('druida',2))).toBeTrue();
    expect(eligibleChoice(bear,character('druida',4))).toBeFalse();
    expect(eligibleChoice(owl,character('druida',7))).toBeFalse();
    expect(eligibleChoice(bear,character('druida',8))).toBeTrue();
    expect(eligibleChoice(owl,character('druida',8))).toBeTrue();
    expect(eligibleChoice(bear,{...character('druida',3),subclassIds:['circulo-da-lua']})).toBeTrue();
  });
  it('matches preparation and cantrip counts on the printed tables', () => {
    expect([6,7,8].map(n => preparedLimit('bardo',n))).toEqual([10,11,12]);
    expect([6,7,8].map(n => preparedLimit('bruxo',n))).toEqual([7,8,9]);
    expect([6,7,8].map(n => preparedLimit('paladino',n))).toEqual([6,7,7]);
    expect([6,7,8].map(n => preparedLimit('ladino',n,true))).toEqual([4,5,6]);
    expect(cantripLimit('feiticeiro',4)).toBe(5);
    expect(maxSpellCircle('ladino',7,true)).toBe(2);
  });
  it('includes Fighter level 6 feats and Battle Master level 7 improvements', () => {
    expect(featLevels('guerreiro',8)).toEqual([4,6,8]);
    expect(featLevels('mago',8)).toEqual([4,8]);
    expect(buildInitialResources({...character('guerreiro',7),subclassIds:['mestre-da-batalha']})['superiority-die'].max).toBe(5);
  });
  it('uses class levels rather than total proficiency for separate psionic pools', () => {
    const p = {...character(),classes:[{classId:'guerreiro' as const,level:3,order:0},{classId:'ladino' as const,level:5,order:1}],subclassIds:['guerreiro-psi','lamina-alma']};
    const pools = buildInitialResources(p);
    expect(pools['psionic-fighter'].max).toBe(4);
    expect(pools['psionic-rogue'].max).toBe(6);
  });
  it('improves resource recovery at subclass level 6', () => {
    const pools = buildInitialResources({...character('clerigo',6),subclassIds:['dominio-da-luz']});
    expect(pools['channel-divinity'].max).toBe(3);
    pools['warding-flare'].current=0;
    expect(recoverResources(pools,'short').resources['warding-flare'].current).toBe(2);
  });
  it('does not stack Extra Attack and supports Valor Bard', () => {
    expect(attackCount({...character('bardo',6),subclassIds:['colegio-da-bravura']})).toBe(2);
    expect(attackCount({...character('guerreiro',5),choices:{invocations:['invocation.lamina-sedenta']}})).toBe(2);
  });
  it('rejects level nine, fractions and repeated class rows', () => {
    expect(validateProfile(character('mago',9)).length).toBeGreaterThan(0);
    expect(validateProfile(character('mago',2.5)).length).toBeGreaterThan(0);
    const p = character('mago',4); p.classes.push({...p.classes[0],order:1});
    expect(validateProfile(p)).toContain('Classes repetidas no perfil.');
  });
  it('validates bonus distributions and exposes overflow instead of silently clamping', () => {
    expect(validateBonuses({strength:2,dexterity:1},['strength','dexterity','wisdom'],3)).toEqual([]);
    expect(validateBonuses({strength:3},['strength'],3).length).toBe(1);
    expect(validateBonuses({charisma:2,wisdom:1},['strength','dexterity','wisdom'],3).length).toBe(1);
    const p = character(); p.abilities.strength=19;
    p.abilities=finalAbilities(p.abilities,[{strength:2}]);
    expect(p.abilities.strength).toBe(21);
    expect(validateProfile(p)).toContain('Atributos devem ser inteiros entre 1 e 20.');
  });
});
