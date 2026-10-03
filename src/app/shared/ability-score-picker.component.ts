import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AbilityGeneration, AbilityId, AbilityScores } from '../models/turn-planner.models';
import { ABILITIES } from '../utils/character-choices';
import { ABILITY_NAMES } from '../utils/character-reference';
import { STANDARD_ARRAY, POINT_COST, pointCost, rollAbilities, rollTotal, scoresFromValues, validateGeneration } from '../utils/ability-generation';

@Component({
  selector:'app-ability-score-picker',standalone:true,
  template:`
    <label class="method">Método de atributos
      <select [value]="generation.method" (change)="changeMethod($event)">
        <option value="free">Livre</option><option value="roll">Dice roll · rolagem</option>
        <option value="array">Array · conjunto padrão</option><option value="point-buy">Point buy · compra de pontos</option>
      </select>
    </label>
    @switch (generation.method) {
      @case ('free') { <p>Informe valores base de 1 a 20, conforme o combinado com sua mesa.</p> }
      @case ('array') { <p>Distribua 15, 14, 13, 12, 10 e 8. Ao escolher um valor já usado, os dois atributos trocam de valor.</p> }
      @case ('roll') {
        <p>Seis rolagens de 4d6, descartando o menor dado de cada uma. Distribua os resultados entre os atributos.</p>
        <button type="button" (click)="roll()">{{ generation.rolls?.length ? 'Rolar novamente os seis atributos' : 'Rolar os seis atributos' }}</button>
        <div class="rolls" aria-live="polite">@for (dice of generation.rolls ?? []; track $index) {
          <span>@for (die of dice; track $index) { <span [class.discarded]="$index === discardedIndex(dice)">{{ die }} </span> }<strong> → {{ total(dice) }}</strong></span>
        }</div>
        @if (generation.rolls?.length) { <p class="budget" aria-live="polite">Resultados disponíveis: {{ remainingRolls.join(' · ') || 'Todos distribuídos' }}</p> }
        <p class="hint">O dado riscado foi descartado. Novas rolagens seguem o combinado com sua mesa.</p>
      }
      @case ('point-buy') {
        <p>Todos começam em 8; máximo base 15. Valores 8–13 custam 0–5 pontos; 14 custa 7 e 15 custa 9.</p>
        <p class="budget" aria-live="polite">{{ spent }} / 27 pontos gastos · {{ 27 - spent }} restantes</p>
      }
    }
    <div class="scores">@for (id of abilities; track id) {
      <label class="score"><span>{{ names[id] }}</span>
        @if (generation.method==='array'||generation.method==='roll') {
          <select [value]="scores[id]" [disabled]="!pool.length" (change)="assign(id,$event)">
            @if (generation.method==='roll') { <option value="0" [selected]="scores[id]===0">{{ pool.length ? 'Escolha um resultado' : 'Role os dados' }}</option> }
            @for (value of uniquePool; track value) { <option [value]="value" [selected]="scores[id]===value" [disabled]="generation.method==='roll' && !canAssign(id,value)">{{ value }}</option> }
          </select>
        } @else {
          <input type="number" [min]="generation.method==='point-buy' ? 8 : 1" [max]="maxScore(id)" [value]="scores[id]" (input)="setScore(id,$event)" />
        }
        @if (generation.method==='point-buy') { <small>Custo: {{ costs[scores[id]] }} ponto(s)</small> }
      </label>
    }</div>
    @if (errors.length) { <p class="error" role="status">{{ errors.join(' ') }}</p> }
  `,
  styles:[`:host{display:block;margin-bottom:1.5rem}.method{display:grid;gap:.5rem;max-width:28rem;font-weight:600}select,input{width:100%;box-sizing:border-box;padding:.8rem;border:1px solid #b8a98b;border-radius:8px;background:#fffdf8;color:#30291f;font:inherit}p{line-height:1.6}button{padding:.7rem 1rem;border:1px solid #b8a98b;border-radius:8px;background:#273136;color:#fff8e9;font:inherit;cursor:pointer}.scores{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.score{display:grid;gap:.5rem;min-width:0}.rolls{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1rem}.rolls>span{padding:.6rem;background:#eee4cc;border-radius:8px}.discarded{text-decoration:line-through;opacity:.55}.hint,small{color:#706451}.budget{font-weight:700}.error{color:#9d312e}select:focus-visible,input:focus-visible,button:focus-visible{outline:2px solid #ac8341;outline-offset:3px}@media(max-width:600px){.scores{grid-template-columns:repeat(2,minmax(0,1fr))}}`],
})
export class AbilityScorePickerComponent {
  @Input() scores!: AbilityScores;
  @Input() generation: AbilityGeneration={method:'free'};
  @Output() selectionChange=new EventEmitter<{scores:AbilityScores;generation:AbilityGeneration}>();
  readonly abilities=ABILITIES;readonly names=ABILITY_NAMES;readonly costs=POINT_COST;readonly total=rollTotal;
  get spent(){return pointCost(this.scores);}
  get pool(){return this.generation.method==='array'?STANDARD_ARRAY:(this.generation.rolls??[]).map(rollTotal);}
  get uniquePool(){return [...new Set(this.pool)];}
  get remainingRolls(){
    const remaining=[...this.pool];
    for(const id of ABILITIES){const index=remaining.indexOf(this.scores[id]);if(index>=0)remaining.splice(index,1);}
    return remaining;
  }
  canAssign(id:AbilityId,value:number){return this.scores[id]===value||this.remainingRolls.includes(value);}
  get errors(){return validateGeneration(this.scores,this.generation);}
  discardedIndex(dice:number[]){return dice.indexOf(Math.min(...dice));}
  emit(scores:AbilityScores,generation=this.generation){this.scores=scores;this.generation=generation;this.selectionChange.emit({scores,generation});}
  changeMethod(event:Event){
    const method=(event.target as HTMLSelectElement).value as AbilityGeneration['method'];
    if(method===this.generation.method)return;
    this.emit(method==='array'?scoresFromValues(STANDARD_ARRAY):method==='point-buy'?scoresFromValues([8,8,8,8,8,8]):method==='roll'?scoresFromValues([0,0,0,0,0,0]):this.scores,{method});
  }
  roll(){const rolls=rollAbilities();this.emit(scoresFromValues([0,0,0,0,0,0]),{method:'roll',rolls});}
  assign(id:AbilityId,event:Event){
    const value=Number((event.target as HTMLSelectElement).value);
    if(this.generation.method==='roll'){
      if(value===0||(this.pool.includes(value)&&this.canAssign(id,value)))this.emit({...this.scores,[id]:value});
      return;
    }
    if(!this.pool.includes(value))return;
    const other=ABILITIES.find(a=>a!==id&&this.scores[a]===value);
    const scores={...this.scores};if(other)scores[other]=scores[id];scores[id]=value;this.emit(scores);
  }
  maxScore(id:AbilityId):number {
    if(this.generation.method!=='point-buy')return 20;
    const budget=27-this.spent+(POINT_COST[this.scores[id]]??0);
    return Math.max(8,...Object.keys(POINT_COST).map(Number).filter(n=>POINT_COST[n]<=budget));
  }
  setScore(id:AbilityId,event:Event){
    const input=event.target as HTMLInputElement;
    const min=this.generation.method==='point-buy'?8:1;
    const n=Number(input.value);const value=Math.max(min,Math.min(this.maxScore(id),Number.isFinite(n)?Math.trunc(n):min));
    input.value=String(value);this.emit({...this.scores,[id]:value});
  }
}
