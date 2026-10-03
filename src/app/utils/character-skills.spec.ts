import { buildCharacterExamples } from '../character-builder/character-examples';
import { CharacterProfile, TurnCatalog, TurnClassId, TurnRuleFile } from '../models/turn-planner.models';
import { SKILLS, skillGrants, skillRows, skillUnavailable, validateSkills } from './character-skills';
describe('Perícias por origem',()=>{
  let catalog:TurnCatalog;
  beforeAll(async()=>{
    const manifest=await (await fetch('/data/turn-rules/manifest.json')).json();
    const files:TurnRuleFile[]=await Promise.all(manifest.files.map(async(file:string)=>(await fetch('/data/turn-rules/'+file)).json()));
    catalog={manifest,options:files.flatMap(f=>f.options??[]),rules:[],features:files.flatMap(f=>f.features??[]),choiceGroups:files.flatMap(f=>f.choiceGroups??[])};
  });
  const character=(id:TurnClassId='guerreiro'):CharacterProfile=>({id:'test',name:'Teste',speciesId:'anao',classes:[{classId:id,level:1,order:0}],abilities:{strength:14,dexterity:14,constitution:12,intelligence:16,wisdom:16,charisma:12},subclassIds:[],featIds:[],fightingStyleIds:[],maneuverIds:[],preparedSpellIds:[],weaponIds:[],masteryIds:[],masteryWeaponIds:[],armor:'none',hasShield:false,speed:9,updatedAt:''});
  for(const id of ['barbaro','bardo','bruxo','clerigo','druida','feiticeiro','guardiao','guerreiro','ladino','mago','monge','paladino'] as TurnClassId[])it(`oferece as escolhas da classe inicial ${id}`,()=>{
    const grant=skillGrants(character(id),catalog).find(g=>g.id===`class.${id}`)!;
    expect(grant.limit).toBe(id==='bardo'||id==='guardiao'?3:id==='ladino'?4:2);
    expect(grant.items.length).toBeGreaterThanOrEqual(grant.limit);
  });
  it('respeita a primeira classe e concede apenas uma perícia para multiclasse elegível',()=>{
    const p=character('guerreiro');p.classes=[{classId:'ladino',level:1,order:1},{classId:'guerreiro',level:2,order:0},{classId:'mago',level:1,order:2}];
    expect(skillGrants(p,catalog).filter(g=>g.id.startsWith('class.')).map(g=>[g.id,g.limit])).toEqual([['class.ladino',1],['class.guerreiro',2]]);
  });
  it('calcula modificador, proficiência, especialização e Pau pra Toda Obra sem empilhar',()=>{
    const p=character('bardo');p.classes[0].level=5;p.skillSelections={'class.bardo':['atuacao','persuasao','percepcao']};p.choices={'bard-expertise':['bard-expertise.persuasao','bard-expertise.atuacao']};
    const rows=skillRows(p,catalog);
    expect(rows.find(s=>s.id==='persuasao')?.bonus).toBe(7);
    expect(rows.find(s=>s.id==='percepcao')?.bonus).toBe(6);
    expect(rows.find(s=>s.id==='arcanismo')?.bonus).toBe(4);
    expect(rows.length).toBe(18);expect(SKILLS.every(s=>!!s.ability)).toBeTrue();
  });
  it('exige proficiência antes de Especialização e revisão após reduzir nível',()=>{
    const p=character('ladino');p.classes[0].level=6;p.skillSelections={'class.ladino':['furtividade','prestidigitacao','percepcao','acrobacia']};p.choices={'rogue-expertise':['rogue-expertise.historia','rogue-expertise.furtividade','rogue-expertise.percepcao','rogue-expertise.prestidigitacao']};
    const grant=skillGrants(p,catalog).find(g=>g.id==='rogue-expertise')!;
    expect(skillUnavailable(p,catalog,grant,'rogue-expertise.historia')).toContain('já seja proficiente');
    p.classes[0].level=2;
    expect(validateSkills(p,catalog).some(e=>e.includes('selecione 2'))).toBeTrue();
  });
  it('preserva escolhas de origens removidas para revisão',()=>{
    const p=character();p.skillSelections={'species.elfo':['percepcao']};
    expect(validateSkills(p,catalog).some(e=>e.includes('origem removida'))).toBeTrue();
    expect(p.skillSelections['species.elfo']).toEqual(['percepcao']);
  });
  it('aceita a combinação de perícias e ferramentas de Habilidoso',()=>{
    const p=character();p.featIds=['habilidoso'];p.skillSelections={'class.guerreiro':['atletismo','percepcao'],'feat.legacy.habilidoso':['arcanismo','tool:Ferramentas de Ladrão','tool:Kit de Disfarce']};
    expect(validateSkills(p,catalog)).toEqual([]);
  });
  it('trata Mente Afiada como nova proficiência ou especialização',()=>{
    const p=character();p.featIds=['mente-afiada'];p.skillSelections={'class.guerreiro':['atletismo','percepcao'],'feat.legacy.mente-afiada':['arcanismo']};
    expect(skillRows(p,catalog).find(s=>s.id==='arcanismo')?.rank).toBe(1);
    p.skillSelections['class.guerreiro']=['historia','percepcao'];p.skillSelections['feat.legacy.mente-afiada']=['historia'];
    expect(skillRows(p,catalog).find(s=>s.id==='historia')?.rank).toBe(2);
  });
  it('soma bônus permanentes do Taumaturgo, Xamã e Glamour Transcendental',()=>{
    const p=character('guardiao');p.classes[0].level=3;p.classes.push({classId:'clerigo',level:1,order:1},{classId:'druida',level:1,order:2});p.subclassIds=['andarilho-feerico'];p.choices={'cleric-order':['cleric.taumaturgo'],'druid-order':['druid.magista']};
    expect(skillRows(p,catalog).find(s=>s.id==='arcanismo')?.bonus).toBe(9);
    expect(skillRows(p,catalog).find(s=>s.id==='persuasao')?.bonus).toBe(4);
  });
  it('todos os exemplos possuem escolhas de perícias completas e válidas',()=>{
    for(const e of buildCharacterExamples(catalog,[]))expect(validateSkills(e.profile,catalog)).withContext(e.profile.name).toEqual([]);
  });
});
