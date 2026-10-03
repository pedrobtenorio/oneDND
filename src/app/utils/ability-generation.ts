import { AbilityGeneration, AbilityScores } from '../models/turn-planner.models';
import { ABILITIES } from './character-choices';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_COST: Record<number, number> = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
export const rollTotal = (dice: number[]): number => [...dice].sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0);
export const pointCost = (scores: AbilityScores): number => ABILITIES.reduce((sum,id)=>sum+(POINT_COST[scores[id]] ?? Infinity),0);
export const scoresFromValues = (values: number[]): AbilityScores => Object.fromEntries(ABILITIES.map((id,i)=>[id,values[i]])) as unknown as AbilityScores;
export function rollAbilities(random: () => number = Math.random): number[][] {
  return Array.from({length:6},()=>Array.from({length:4},()=>Math.floor(random()*6)+1));
}
export function validateGeneration(scores: AbilityScores, generation?: AbilityGeneration): string[] {
  if (!generation) return [];
  const values=ABILITIES.map(id=>scores[id]);
  if(generation.method==='roll'&&values.includes(0))return ['Rolagem: escolha um resultado para cada atributo antes de avançar.'];
  if (!values.every(n=>Number.isInteger(n)&&n>=1&&n<=20)) return ['Atributos base devem ser inteiros entre 1 e 20.'];
  if (generation.method==='free') return [];
  if (generation.method==='point-buy') {
    if (!values.every(n=>n>=8&&n<=15)) return ['Compra de pontos: atributos base entre 8 e 15.'];
    return pointCost(scores)===27 ? [] : ['Compra de pontos: distribua os 27 pontos antes de avançar.'];
  }
  let pool=STANDARD_ARRAY;
  if (generation.method==='roll') {
    const rolls=generation.rolls;
    if (!Array.isArray(rolls)||rolls.length!==6||!rolls.every(d=>Array.isArray(d)&&d.length===4&&d.every(n=>Number.isInteger(n)&&n>=1&&n<=6))) return ['Rolagem: gere seis resultados de 4d6, descartando o menor dado.'];
    pool=rolls.map(rollTotal);
  } else if (generation.method!=='array') return ['Método de atributos inválido.'];
  const sorted=(ns:number[])=>[...ns].sort((a,b)=>a-b).join(',');
  return sorted(values)===sorted(pool) ? [] : ['Atributos: distribua cada resultado do conjunto exatamente uma vez.'];
}
