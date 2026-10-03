import { acquiredFeatures, backgroundSkills, requirementLabels } from './character-reference';
import { CharacterFeature, CharacterOption, CharacterProfile, TurnCatalog } from '../models/turn-planner.models';
describe('Referências da ficha e comparação', () => {
  const source={book:'Livro do Jogador',revision:'2024',page:10};
  it('explica requisitos alternativos sem transformá-los em requisitos cumulativos', () => {
    const option:CharacterOption={id:'feat',name:'Talento',kind:'feat-general',summary:'',source,requirements:[{minTotalLevel:4,anyAbility:['strength','dexterity'],abilityMin:13},{feature:'spellcasting'}]};
    expect(requirementLabels(option)).toEqual(['Nível total 4','Força ou Destreza 13','Conjuração ou Magia de Pacto']);
  });
  it('não concede características futuras, de outra subclasse ou de outra espécie', () => {
    const feature=(id:string,extra:Partial<CharacterFeature>):CharacterFeature=>({id,name:id,minLevel:1,description:'',source,...extra});
    const catalog={features:[feature('classe',{classId:'mago'}),feature('futuro',{classId:'mago',minLevel:5}),feature('outra',{classId:'mago',subclassId:'ilusionista'}),feature('especie',{speciesId:'aasimar',minLevel:3})]} as TurnCatalog;
    const profile: CharacterProfile={id:'test',name:'Teste',classes:[{classId:'mago',level:2,order:0}],subclassIds:[],speciesId:'aasimar',abilities:{strength:10,dexterity:10,constitution:10,intelligence:10,wisdom:10,charisma:10},featIds:[],fightingStyleIds:[],maneuverIds:[],preparedSpellIds:[],weaponIds:[],masteryIds:[],masteryWeaponIds:[],armor:'none',hasShield:false,speed:9,updatedAt:''};
    expect(acquiredFeatures(profile,catalog).map(f=>f.id)).toEqual(['classe']);
  });
  it('extrai apenas perícias explicitamente concedidas pelo antecedente', () => {
    expect(backgroundSkills({summary:'Proficiências em Perícias: Intuição, Religião Proficiência com Ferramentas: Kit'} as CharacterOption)).toEqual(['Intuição','Religião']);
    expect(backgroundSkills()).toEqual([]);
    expect(backgroundSkills({summary:'Proficiência em Perícias: Atletismo, Percepção Proficiência com Ferramentas: Kit'} as CharacterOption)).toEqual(['Atletismo','Percepção']);
  });
});
