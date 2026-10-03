import { TestBed } from '@angular/core/testing';
import { ChoiceExplanationComponent } from './choice-explanation.component';
import { CharacterOption } from '../models/turn-planner.models';
describe('Comparação de escolhas', () => {
  it('mantém comparação independente da escolha e exibe as características por nível', () => {
    const fixture = TestBed.createComponent(ChoiceExplanationComponent);
    const source = {book:'Livro do Jogador',revision:'2024',page:10};
    const options:CharacterOption[] = ['guerreiro','barbaro'].map(id=>({id,name:id,kind:'subclass',summary:id,source}));
    fixture.componentRef.setInput('mode','class');fixture.componentRef.setInput('options',options);
    fixture.componentRef.setInput('selectedId','guerreiro');fixture.componentRef.setInput('classLevels',{guerreiro:8,barbaro:0});
    fixture.componentRef.setInput('features',[{id:'furia',name:'Fúria',classId:'barbaro',minLevel:1,description:'Fúria',source}]);
    fixture.detectChanges();
    const selects=fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    expect(selects[0].value).toBe('guerreiro');
    selects[1].value='barbaro';selects[1].dispatchEvent(new Event('change'));fixture.detectChanges();
    expect(fixture.componentInstance.ids).toEqual(['guerreiro','barbaro']);
    expect(fixture.componentInstance.selectedId).toBe('guerreiro');
    expect(fixture.nativeElement.textContent).toContain('Nível 1 · Fúria');
    expect(fixture.nativeElement.textContent).not.toContain('(futuro)');
    fixture.componentRef.setInput('selectedId','barbaro');fixture.detectChanges();
    expect(selects[0].value).toBe('barbaro');
  });
});
