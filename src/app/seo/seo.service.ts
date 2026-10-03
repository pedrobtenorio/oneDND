import {DOCUMENT} from '@angular/common';
import {Injectable,inject,DestroyRef} from '@angular/core';
import {Router,NavigationEnd} from '@angular/router';
import {Meta,Title} from '@angular/platform-browser';
import {filter} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import pages from './pages.json';
import {SITE_URL} from './site-config';

@Injectable({providedIn:'root'})
export class SeoService {
  private readonly document=inject(DOCUMENT);
  private readonly router=inject(Router);
  private readonly meta=inject(Meta);
  private readonly title=inject(Title);
  private readonly destroyRef=inject(DestroyRef);
  constructor(){
    this.router.events.pipe(filter(e=>e instanceof NavigationEnd),takeUntilDestroyed(this.destroyRef)).subscribe(e=>this.update((e as NavigationEnd).urlAfterRedirects));
  }
  update(url:string):void {
    const path=url.split(/[?#]/)[0].replace(/^\/+|\/+$/g,'');
    const page=pages.find(p=>p.path===path);
    const title=(page?.title??(path.startsWith('personagens/')?'Ficha do personagem':'Página não encontrada'))+' | One D&D';
    const description=page?.description??'Ferramentas e compêndio de D&D 2024 em português.';
    const noindex=!page||page.noindex;
    this.title.setTitle(title);
    this.meta.updateTag({name:'description',content:description});
    this.meta.updateTag({name:'robots',content:noindex?'noindex, follow':'index, follow'});
    this.meta.updateTag({property:'og:title',content:title});
    this.meta.updateTag({property:'og:description',content:description});
    this.meta.updateTag({property:'og:type',content:'website'});
    this.meta.updateTag({property:'og:site_name',content:'One D&D'});
    this.meta.updateTag({property:'og:locale',content:'pt_BR'});
    this.meta.updateTag({name:'twitter:card',content:'summary_large_image'});
    this.meta.updateTag({name:'twitter:title',content:title});
    this.meta.updateTag({name:'twitter:description',content:description});
    let canonical=this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if(SITE_URL&&page&&!noindex){
      if(!canonical){canonical=this.document.createElement('link');canonical.rel='canonical';this.document.head.appendChild(canonical);}
      canonical.href=SITE_URL+'/'+path;
      this.meta.updateTag({property:'og:url',content:canonical.href});
    } else {canonical?.remove();this.meta.removeTag('property="og:url"');}
    if(SITE_URL){
      const image=SITE_URL+'/assets/seo/social-card.png';
      this.meta.updateTag({property:'og:image',content:image});
      this.meta.updateTag({property:'og:image:alt',content:'One D&D — compêndio e ferramentas de D&D 2024 em português'});
      this.meta.updateTag({name:'twitter:image',content:image});
    }
    this.document.getElementById('seo-structured-data')?.remove();
    if(SITE_URL&&page&&!noindex){
      const url=SITE_URL+'/'+path;
      const script=this.document.createElement('script');script.id='seo-structured-data';script.type='application/ld+json';
      const breadcrumbs=[{name:'Guia de D&D 2024',item:SITE_URL+'/guia'}];
      if(path.startsWith('classes/'))breadcrumbs.push({name:'Classes',item:SITE_URL+'/classes'});
      if(path!=='guia')breadcrumbs.push({name:page.title.split(' em D&D')[0],item:url});
      script.textContent=JSON.stringify({'@context':'https://schema.org','@graph':[
        {'@type':'WebSite','@id':SITE_URL+'/#website',url:SITE_URL,name:'One D&D',inLanguage:'pt-BR'},
        {'@type':'WebPage','@id':url+'#webpage',url,name:page.title,description,inLanguage:'pt-BR',isPartOf:{'@id':SITE_URL+'/#website'}},
        {'@type':'BreadcrumbList',itemListElement:breadcrumbs.map((b,i)=>({'@type':'ListItem',position:i+1,...b}))},
      ]}).replaceAll('<','\\u003c');
      this.document.head.appendChild(script);
    }
  }
}
