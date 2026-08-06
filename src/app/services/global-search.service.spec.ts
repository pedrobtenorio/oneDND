import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GlobalSearchService } from './global-search.service';
import { GuideService } from './guide.service';
import { SpellService } from './spell.service';
import { SummonService } from './summon.service';
import { WeaponsService } from './weapons.service';

describe('GlobalSearchService', () => {
  let service: GlobalSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GlobalSearchService,
        {
          provide: GuideService,
          useValue: {
            getGuide: () =>
              of([
                {
                  id: 'condicoes',
                  title: 'Condições',
                  items: [{ id: 'contido', name: 'Contido', description: 'Deslocamento 0.' }],
                },
                {
                  id: 'glossario',
                  title: 'Glossário',
                  items: [{ id: 'vantagem', name: 'Vantagem', description: 'Role dois d20.' }],
                },
              ]),
          },
        },
        {
          provide: SpellService,
          useValue: {
            getSpells: () =>
              of([
                {
                  id: 'curar-ferimentos',
                  name: 'Curar Ferimentos',
                  level: 1,
                  school: 'Evocação',
                  classes: ['Clérigo'],
                  castingTime: 'Ação',
                  range: 'Toque',
                  components: ['V', 'S'],
                  duration: 'Instantânea',
                  description: 'Uma criatura recupera pontos de vida.',
                },
              ]),
          },
        },
        {
          provide: SummonService,
          useValue: {
            getSummons: () =>
              of([
                {
                  id: 'familiar-gato',
                  name: 'Gato',
                  type: 'Fera Minúscula',
                  ac: '12',
                  hp: '2',
                  speed: '12 m',
                  str: { value: 3, mod: '-4' },
                  dex: { value: 15, mod: '+2' },
                  con: { value: 10, mod: '+0' },
                  int: { value: 3, mod: '-4' },
                  wis: { value: 12, mod: '+1' },
                  cha: { value: 7, mod: '-2' },
                  senses: 'Percepção Passiva 11',
                  languages: '-',
                  cr: '0',
                },
              ]),
          },
        },
        {
          provide: WeaponsService,
          useValue: {
            getWeapons: () =>
              of({
                properties: [{ id: 'property-acuidade', name: 'Acuidade', description: 'Use Força ou Destreza.' }],
                masteryProperties: [{ id: 'mastery-agil', name: 'Ágil', description: 'Ataque adicional.' }],
                categories: [
                  {
                    name: 'Armas Simples',
                    weapons: [
                      {
                        id: 'weapon-adaga',
                        name: 'Adaga',
                        damage: '1d4 Perfurante',
                        properties: 'Acuidade, Leve',
                        mastery: 'Ágil',
                        weight: '0,5 kg',
                        cost: '2 PO',
                      },
                    ],
                  },
                ],
              }),
          },
        },
      ],
    });

    service = TestBed.inject(GlobalSearchService);
  });

  it('finds spells with accent-insensitive search', (done) => {
    service.search('curar evocacao').subscribe((results) => {
      expect(results[0]).toEqual(jasmine.objectContaining({ title: 'Curar Ferimentos', route: '/magias' }));
      done();
    });
  });

  it('finds guide entries and uses fragments', (done) => {
    service.search('contido').subscribe((results) => {
      expect(results[0]).toEqual(
        jasmine.objectContaining({ title: 'Contido', route: '/guia', fragment: 'contido' })
      );
      done();
    });
  });

  it('finds weapons and weapon metadata', (done) => {
    service.search('agil adaga').subscribe((results) => {
      expect(results.some((result) => result.title === 'Adaga')).toBeTrue();
      done();
    });
  });
});
