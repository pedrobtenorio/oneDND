import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
@Component({selector:'app-not-found',standalone:true,imports:[RouterLink],template:`<section style="padding:40px"><h1>Página não encontrada</h1><p>O endereço não corresponde a uma página do compêndio.</p><a routerLink="/guia">Voltar ao guia de regras</a></section>`})
export class NotFoundComponent {}
