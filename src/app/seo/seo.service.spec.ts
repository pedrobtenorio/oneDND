import {TestBed} from '@angular/core/testing';
import {DOCUMENT} from '@angular/common';
import {provideRouter} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {SeoService} from './seo.service';
import {SITE_URL} from './site-config';
describe('SEO por página',()=>{
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideRouter([])]}));
  it('atualiza metadados sem duplicar e não inclui parâmetros no canonical',()=>{
    const seo=TestBed.inject(SeoService);const doc=TestBed.inject(DOCUMENT);
    seo.update('/classes/guardiao?filtro=teste#regras');
    expect(TestBed.inject(Title).getTitle()).toContain('Guardião em D&D 2024');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(SITE_URL+'/classes/guardiao');
    seo.update('/armas');expect(doc.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/armas');
    expect(doc.querySelectorAll('#seo-structured-data').length).toBe(1);
  });
  it('remove canonical e dados estruturados ao abrir ficha pessoal ou busca',()=>{
    const seo=TestBed.inject(SeoService);const doc=TestBed.inject(DOCUMENT);
    seo.update('/classes');seo.update('/personagens/meu-personagem');
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();expect(doc.querySelector('#seo-structured-data')).toBeNull();
    seo.update('/busca?q=fogo');expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
    seo.update('/rota-inexistente');expect(TestBed.inject(Title).getTitle()).toContain('Página não encontrada');
  });
});
