import { AbilityId, CharacterProfile, TurnCatalog, TurnClassId } from '../models/turn-planner.models';
import { ABILITY_NAMES, CLASS_NAMES, backgroundSkills } from './character-reference';
import { normalizeKey } from './linkify';
import { classLevel, proficiencyBonus } from './turn-engine/turn-profile';

export const SKILLS: Array<{id:string;name:string;ability:AbilityId}> = [
  ['acrobacia','Acrobacia','dexterity'],['arcanismo','Arcanismo','intelligence'],['atletismo','Atletismo','strength'],
  ['atuacao','Atuação','charisma'],['enganacao','Enganação','charisma'],['furtividade','Furtividade','dexterity'],
  ['historia','História','intelligence'],['intimidacao','Intimidação','charisma'],['intuicao','Intuição','wisdom'],
  ['investigacao','Investigação','intelligence'],['lidar-com-animais','Lidar com Animais','wisdom'],['medicina','Medicina','wisdom'],
  ['natureza','Natureza','intelligence'],['percepcao','Percepção','wisdom'],['persuasao','Persuasão','charisma'],
  ['prestidigitacao','Prestidigitação','dexterity'],['religiao','Religião','intelligence'],['sobrevivencia','Sobrevivência','wisdom'],
].map(([id,name,ability]) => ({id,name,ability:ability as AbilityId}));
const all = SKILLS.map(s=>s.id);
const lists: Record<TurnClassId, string[]> = {
  barbaro:['atletismo','intimidacao','lidar-com-animais','natureza','percepcao','sobrevivencia'], bardo:all,
  bruxo:['arcanismo','enganacao','historia','intimidacao','investigacao','natureza','religiao'],
  clerigo:['historia','intuicao','medicina','persuasao','religiao'],
  druida:['arcanismo','lidar-com-animais','intuicao','medicina','natureza','percepcao','religiao','sobrevivencia'],
  feiticeiro:['arcanismo','enganacao','intimidacao','intuicao','persuasao','religiao'],
  guardiao:['atletismo','furtividade','intuicao','investigacao','lidar-com-animais','natureza','percepcao','sobrevivencia'],
  guerreiro:['acrobacia','atletismo','historia','intimidacao','intuicao','lidar-com-animais','percepcao','persuasao','sobrevivencia'],
  ladino:['acrobacia','atletismo','enganacao','furtividade','intimidacao','intuicao','investigacao','percepcao','persuasao','prestidigitacao'],
  mago:['arcanismo','historia','intuicao','investigacao','medicina','natureza','religiao'],
  monge:['acrobacia','atletismo','furtividade','historia','intuicao','religiao'],
  paladino:['atletismo','intimidacao','intuicao','medicina','persuasao','religiao'],
};
const pages:Record<TurnClassId,number>={barbaro:51,bardo:59,bruxo:69,clerigo:81,druida:91,feiticeiro:103,guardiao:117,guerreiro:127,ladino:137,mago:147,monge:159,paladino:167};
export const SKILL_CHOICE_GROUPS = ['lore-skills','wizard-scholar','barbarian-knowledge','bard-expertise','rogue-expertise','ranger-expertise','fey-glamour','battle-study'];
const expertiseGroups = ['wizard-scholar','bard-expertise','rogue-expertise','ranger-expertise'];
export interface SkillGrant {id:string;name:string;limit:number;mode:'proficiency'|'expertise'|'adaptive';items:Array<{id:string;skillId:string}>;storage:'skills'|'choices';tools?:boolean;page:number}
const skillId=(name:string):string=>normalizeKey(name).replace(/ /g,'-');
function sourceLabel(source:string):string {
  const [type,id,level]=source.split('.');
  return type==='class'?`${CLASS_NAMES[id as TurnClassId]} · nível ${level}`:type==='background'?'antecedente':type==='species'?'espécie':source.startsWith('legacy.')?'escolha antiga':source;
}
export function skillGrants(p:CharacterProfile,catalog:TurnCatalog):SkillGrant[] {
  const grants:SkillGrant[]=[];
  const add=(id:string,name:string,limit:number,skills:string[],page:number,mode:SkillGrant['mode']='proficiency',tools=false)=>grants.push({id,name,limit,mode,tools,page,storage:'skills',items:skills.map(skillId=>({id:skillId,skillId}))});
  const first=[...p.classes].sort((a,b)=>a.order-b.order)[0]?.classId;
  for(const c of p.classes) {
    const primary=c.classId===first;
    const limit=primary ? c.classId==='bardo'||c.classId==='guardiao'?3:c.classId==='ladino'?4:2 : ['bardo','guardiao','ladino'].includes(c.classId)?1:0;
    if(limit)add(`class.${c.classId}`,`${CLASS_NAMES[c.classId]} · ${primary?'classe inicial':'multiclasse'}`,limit,lists[c.classId],pages[c.classId]);
  }
  if(p.speciesId==='humano')add('species.humano','Humano · Hábil',1,all,193);
  if(p.speciesId==='elfo')add('species.elfo','Elfo · Sentidos Aguçados',1,['intuicao','percepcao','sobrevivencia'],190);
  const background=catalog.options.find(o=>o.id===p.backgroundId);
  const feats=[...(background?.grantedFeatId?[{source:'background',optionId:background.grantedFeatId}]:[]),...(p.featSelections??[])];
  for(const id of p.featIds)if(!feats.some(f=>f.optionId===id))feats.push({source:`legacy.${id}`,optionId:id});
  for(const feat of feats){
    const name=catalog.options.find(o=>o.id===feat.optionId)?.name??feat.optionId;
    if(feat.optionId==='habilidoso')add(`feat.${feat.source}`,`${name} · ${sourceLabel(feat.source)}`,3,all,201,'proficiency',true);
    if(feat.optionId==='especialista-em-pericia'){
      add(`feat.${feat.source}.proficiency`,`${name} · nova proficiência`,1,all,205);
      add(`feat.${feat.source}.expertise`,`${name} · Especialização`,1,all,205,'expertise');
    }
    if(feat.optionId==='mente-afiada')add(`feat.${feat.source}`,name,1,['arcanismo','historia','investigacao','natureza','religiao'],205,'adaptive');
    if(feat.optionId==='observador')add(`feat.${feat.source}`,name,1,['intuicao','investigacao','percepcao'],202,'adaptive');
  }
  for(const g of catalog.choiceGroups??[])if(SKILL_CHOICE_GROUPS.includes(g.id)&&classLevel(p,g.classId)>=g.minLevel&&(!g.subclassId||p.subclassIds.includes(g.subclassId))){
    const options=catalog.options.filter(o=>o.group===g.id);
    grants.push({id:g.id,name:g.name,limit:g.limits[classLevel(p,g.classId)]??0,mode:expertiseGroups.includes(g.id)?'expertise':'proficiency',storage:'choices',page:options[0]?.source.page??0,items:options.map(o=>({id:o.id,skillId:skillId(o.name)}))});
  }
  return grants;
}
export const grantSelections=(p:CharacterProfile,g:SkillGrant):string[] => (g.storage==='choices'?p.choices:p.skillSelections)?.[g.id]??[];
function skillSources(p:CharacterProfile,catalog:TurnCatalog,exclude?:string,skipAdaptive=false){
  const sources=new Map<string,string[]>();const expert=new Map<string,string[]>();
  const add=(map:Map<string,string[]>,id:string,name:string)=>map.set(id,[...(map.get(id)??[]),name]);
  const background=catalog.options.find(o=>o.id===p.backgroundId);
  for(const name of backgroundSkills(background))add(sources,skillId(name),`Antecedente · ${background!.name}`);
  const grants=skillGrants(p,catalog).filter(g=>g.id!==exclude);
  for(const g of grants.filter(g=>g.mode==='proficiency'))for(const id of grantSelections(p,g)){
    const item=g.items.find(i=>i.id===id);if(item)add(sources,item.skillId,g.name);
  }
  for(const g of grants.filter(g=>g.mode==='adaptive'&&!skipAdaptive))for(const id of grantSelections(p,g)){
    const item=g.items.find(i=>i.id===id);if(item){if(sources.has(item.skillId))add(expert,item.skillId,g.name);else add(sources,item.skillId,g.name);}
  }
  for(const g of grants.filter(g=>g.mode==='expertise'))for(const id of grantSelections(p,g)){
    const item=g.items.find(i=>i.id===id);if(item&&sources.has(item.skillId))add(expert,item.skillId,g.name);
  }
  return {sources,expert};
}
export function skillUnavailable(p:CharacterProfile,catalog:TurnCatalog,g:SkillGrant,id:string):string {
  const item=g.items.find(i=>i.id===id);if(!item)return 'Opção fora desta concessão.';
  const {sources,expert}=skillSources(p,catalog,g.id,g.mode==='proficiency');
  if(g.mode==='proficiency'&&sources.has(item.skillId))return 'Você já tem proficiência nesta perícia por outra origem.';
  if(g.mode==='expertise'&&!sources.has(item.skillId))return 'Escolha uma perícia em que já seja proficiente.';
  if(g.mode!=='proficiency'&&expert.has(item.skillId))return 'Esta perícia já possui Especialização por outra origem.';
  return '';
}
export function validateSkills(p:CharacterProfile,catalog:TurnCatalog):string[]{
  const grants=skillGrants(p,catalog),errors:string[]=[];
  for(const g of grants){
    const selected=grantSelections(p,g);
    if(selected.length!==g.limit||new Set(selected).size!==selected.length)errors.push(`${g.name}: selecione ${g.limit} proficiência(s) ou especialização(ões).`);
    for(const id of selected){
      if(g.tools&&id.startsWith('tool:')&&id.slice(5).trim().length>0&&id.length<=125)continue;
      const error=skillUnavailable(p,catalog,g,id);if(error)errors.push(`${g.name}: ${error}`);
    }
  }
  for(const [id,selected] of Object.entries(p.skillSelections??{}))if(selected.length&&!grants.some(g=>g.storage==='skills'&&g.id===id))errors.push(`Perícias de uma origem removida: ${id}. Revise essas escolhas.`);
  return errors;
}
export function skillRows(p:CharacterProfile,catalog:TurnCatalog){
  const {sources,expert}=skillSources(p,catalog),bonus=proficiencyBonus(p),jack=classLevel(p,'bardo')>=2;
  const insight=classLevel(p,'clerigo')>=1&&Object.values(p.choices??{}).flat().includes('cleric.taumaturgo');
  const magician=classLevel(p,'druida')>=1&&Object.values(p.choices??{}).flat().includes('druid.magista');
  const fey=p.subclassIds.includes('andarilho-feerico')&&classLevel(p,'guardiao')>=3;
  return SKILLS.map(skill=>{
    const rank=expert.has(skill.id)?2:sources.has(skill.id)?1:0;
    const modifier=Math.floor((p.abilities[skill.ability]-10)/2);
    const specialSources=[...(insight&&['arcanismo','religiao'].includes(skill.id)?['Ordem Divina · Taumaturgo']:[]),...(magician&&['arcanismo','natureza'].includes(skill.id)?['Ordem Primal · Xamã']:[]),...(fey&&skill.ability==='charisma'?['Glamour Transcendental']:[])];
    const additional=specialSources.length*Math.max(1,Math.floor((p.abilities.wisdom-10)/2));
    const extraSources=[...specialSources,...(!rank&&jack?['Pau pra Toda Obra']:[])];
    return {...skill,abilityName:ABILITY_NAMES[skill.ability],rank,bonus:modifier+(rank?rank*bonus:jack?Math.floor(bonus/2):0)+additional,sources:[...(sources.get(skill.id)??[]),...(expert.get(skill.id)??[]),...extraSources]};
  });
}
