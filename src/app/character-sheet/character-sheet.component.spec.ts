import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { CharacterSheetComponent } from './character-sheet.component';
import { TurnPlannerStorageService } from '../services/turn-planner-storage.service';
import { TurnRuleCatalogService } from '../services/turn-rule-catalog.service';
import { SpellService } from '../services/spell.service';
import { CharacterProfile, TurnCatalog } from '../models/turn-planner.models';

describe('Ficha rápida', () => {
  const profile: CharacterProfile = {id:'saved',name:'Teste',speciesId:'humano',classes:[{classId:'mago',level:3,order:0}],subclassIds:[],abilities:{strength:10,dexterity:12,constitution:14,intelligence:16,wisdom:10,charisma:8},featIds:[],fightingStyleIds:[],maneuverIds:[],preparedSpellIds:['preparada'],cantripIds:[],weaponIds:[],masteryIds:[],masteryWeaponIds:[],armor:'none',hasShield:false,speed:9,updatedAt:'',spellSelections:{'class.mago':['preparada'],'book.mago.1':['preparada','livro']}};
  const catalog: TurnCatalog = {manifest:{schemaVersion:1,edition:'2024',revision:'',files:[]},options:[],rules:[],features:[]};
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({id:'saved'}));
    TestBed.configureTestingModule({imports:[CharacterSheetComponent], providers:[provideRouter([]),
      {provide:ActivatedRoute,useValue:{paramMap:params}},
      {provide:TurnPlannerStorageService,useValue:{profiles$:of([profile])}},
      {provide:TurnRuleCatalogService,useValue:{getCatalog:()=>of(catalog)}},
      {provide:SpellService,useValue:{getSpells:()=>of([])}},
    ]});
  });
  it('consulta valores finais sem reaplicar bônus e separa grimório de magias disponíveis', () => {
    const fixture=TestBed.createComponent(CharacterSheetComponent); fixture.detectChanges();
    const component=fixture.componentInstance;
    expect(component.profile?.abilities.intelligence).toBe(16);
    expect(component.modifier(16)).toBe('+3');
    expect(component.spellGroups.find(g=>g.name==='Magias disponíveis')?.entries.map(e=>e.id)).toEqual(['preparada']);
    expect(component.spellGroups.find(g=>g.name.startsWith('Grimório'))?.entries.map(e=>e.id)).toEqual(['livro']);
    expect(fixture.nativeElement.textContent).toContain('Há escolhas de perícias pendentes');
    expect(component.skills.length).toBe(18);
    expect(component.skills.find(s=>s.id==='arcanismo')?.abilityName).toBe('Inteligência');
  });
  it('resolve exemplos e atualiza a ficha quando muda o parâmetro da rota', () => {
    const fixture=TestBed.createComponent(CharacterSheetComponent); fixture.detectChanges();
    params.next(convertToParamMap({id:'example-rodrigo'}));fixture.detectChanges();
    expect(fixture.componentInstance.profile?.name).toBe('Rodrigo');
    expect(fixture.componentInstance.example).toBeTrue();
    expect(fixture.componentInstance.resources.find(r=>r.id==='second-wind')?.max).toBe(3);
    params.next(convertToParamMap({id:'inexistente'}));fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Personagem não encontrado');
  });
});
