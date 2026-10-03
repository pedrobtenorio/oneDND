import { AbilityScorePickerComponent } from './ability-score-picker.component';
import { scoresFromValues, STANDARD_ARRAY, pointCost, validateGeneration } from '../utils/ability-generation';

describe('Escolha de atributos',()=>{
  const event=(value:string)=>({target:{value}} as unknown as Event);
  it('troca os valores ao redistribuir o conjunto padrão',()=>{
    const c=new AbilityScorePickerComponent();c.generation={method:'array'};c.scores=scoresFromValues(STANDARD_ARRAY);
    c.assign('charisma',event('15'));
    expect(c.scores.charisma).toBe(15);expect(c.scores.strength).toBe(8);
    expect(validateGeneration(c.scores,c.generation)).toEqual([]);
  });
  it('bloqueia digitação acima do orçamento e permite devolver pontos',()=>{
    const c=new AbilityScorePickerComponent();c.generation={method:'point-buy'};c.scores=scoresFromValues([15,15,15,8,8,8]);
    const input=event('15');c.setScore('charisma',input);
    expect(c.scores.charisma).toBe(8);expect((input.target as HTMLInputElement).value).toBe('8');
    c.setScore('strength',event('14'));c.setScore('charisma',event('15'));
    expect(c.scores.charisma).toBe(10);expect(pointCost(c.scores)).toBe(27);
  });
  it('gera resultados rastreáveis e mantém os valores ao voltar ao modo livre',()=>{
    const c=new AbilityScorePickerComponent();c.scores=scoresFromValues(STANDARD_ARRAY);c.roll();
    expect(c.generation.rolls?.length).toBe(6);expect(Object.values(c.scores)).toEqual([0,0,0,0,0,0]);
    expect(validateGeneration(c.scores,c.generation).length).toBe(1);
    const before={...c.scores};c.changeMethod(event('free'));expect(c.scores).toEqual(before);
  });
  it('distribui cada resultado rolado uma vez e devolve ao liberar o atributo',()=>{
    const c=new AbilityScorePickerComponent();c.scores=scoresFromValues([0,0,0,0,0,0]);
    c.generation={method:'roll',rolls:[[1,6,6,6],[1,5,5,5],[1,4,4,4],[1,4,4,4],[1,3,3,3],[1,2,2,2]]};
    c.assign('charisma',event('18'));c.assign('strength',event('18'));
    expect(c.scores.charisma).toBe(18);expect(c.scores.strength).toBe(0);
    c.assign('constitution',event('12'));c.assign('wisdom',event('12'));
    expect(c.remainingRolls).toEqual([15,9,6]);
    c.assign('charisma',event('0'));expect(c.remainingRolls).toContain(18);
    c.assign('strength',event('18'));c.assign('charisma',event('15'));c.assign('dexterity',event('9'));c.assign('intelligence',event('6'));
    expect(c.remainingRolls).toEqual([]);expect(validateGeneration(c.scores,c.generation)).toEqual([]);
  });
});
