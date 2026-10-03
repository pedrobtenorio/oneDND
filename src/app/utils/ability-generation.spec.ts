import { rollAbilities, rollTotal, scoresFromValues, STANDARD_ARRAY, pointCost, validateGeneration } from './ability-generation';

describe('Geração de atributos base',()=>{
  it('descarta apenas um dado, incluindo empates',()=>{
    expect(rollTotal([1,6,3,5])).toBe(14);
    expect(rollTotal([2,2,2,2])).toBe(6);
    expect(rollTotal([6,6,6,6])).toBe(18);
    expect(rollAbilities(()=>0)).toEqual(Array.from({length:6},()=>[1,1,1,1]));
  });
  it('exige o conjunto padrão inteiro, sem duplicar valores',()=>{
    expect(validateGeneration(scoresFromValues([...STANDARD_ARRAY].reverse()),{method:'array'})).toEqual([]);
    expect(validateGeneration(scoresFromValues([15,15,13,12,10,8]),{method:'array'}).length).toBe(1);
  });
  it('cobra os custos maiores de 14 e 15 e limita a 27 pontos',()=>{
    const valid=scoresFromValues([15,15,15,8,8,8]);
    expect(pointCost(valid)).toBe(27);
    expect(pointCost(scoresFromValues(STANDARD_ARRAY))).toBe(27);
    expect(validateGeneration(valid,{method:'point-buy'})).toEqual([]);
    expect(validateGeneration(scoresFromValues([16,8,8,8,8,8]),{method:'point-buy'}).length).toBe(1);
    expect(validateGeneration(scoresFromValues([8,8,8,8,8,8]),{method:'point-buy'}).length).toBe(1);
  });
  it('preserva resultados repetidos e rejeita dados malformados',()=>{
    const rolls=Array.from({length:6},()=>[1,2,3,4]);
    expect(validateGeneration(scoresFromValues([9,9,9,9,9,9]),{method:'roll',rolls})).toEqual([]);
    expect(validateGeneration(scoresFromValues([10,9,9,9,9,9]),{method:'roll',rolls}).length).toBe(1);
    expect(validateGeneration(scoresFromValues(STANDARD_ARRAY),{method:'roll',rolls:[[7,1,2,3]]}).length).toBe(1);
  });
  it('mantém atributos antigos sem método e permite valores livres inteiros',()=>{
    expect(validateGeneration(scoresFromValues(STANDARD_ARRAY))).toEqual([]);
    expect(validateGeneration(scoresFromValues([1,20,10,11,12,13]),{method:'free'})).toEqual([]);
    expect(validateGeneration(scoresFromValues([1.5,20,10,11,12,13]),{method:'free'}).length).toBe(1);
  });
});
