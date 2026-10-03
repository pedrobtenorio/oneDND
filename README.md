# Ficha Automática de D&D 2024

Aplicação Angular para consultar regras do Livro do Jogador 2024, montar personagens até o nível total 8 e orientar ações, recursos, magias e descansos durante o combate. Os dados ficam no navegador; o projeto não possui backend.

## Funcionalidades

- Criador em cinco etapas: identidade e origem, classes e progressão, atributos e talentos, escolhas e magias, equipamento e revisão.
- Multiclasse limitada a 8 níveis totais, com espaços de conjuração comuns, Magia de Pacto e subclasses conjuradoras calculados separadamente.
- Catálogos pesquisáveis de regras, magias, armas, espécies, antecedentes, classes e subclasses.
- Planejador de turnos independente da interface, com ações, reações, recursos e recuperação em descansos.
- Armazenamento e exportação v2, migração de v1 com cópia de segurança local e modo legado para atributos finais antigos.
- Layout responsivo com navegação lateral no desktop e menu recolhível em telas menores.

## Arquitetura

O projeto usa Angular 20, componentes standalone, Angular Material e arquivos JSON em `public/data`.

- `src/app/character-builder`: criação, edição e revisão de personagens.
- `src/app/utils/character-progression.ts`: limites de nível, talentos, truques, magias e espaços de conjuração.
- `src/app/utils/character-choices.ts`: atributos finais, origens de magia e elegibilidade de escolhas.
- `src/app/utils/turn-engine`: perfil validado, avaliação de regras e redutor de turnos sem dependência da interface.
- `src/app/services/turn-rule-catalog.service.ts`: composição dos catálogos de regras.
- `src/app/services/turn-planner-storage.service.ts`: persistência, importação, exportação e migração.
- `public/data/turn-rules`: opções, progressões, características e regras com referência ao livro.
- `docs/auditoria-livro-jogador-niveis-1-8.md`: matriz de cobertura gerada a partir dos catálogos.

As rotas principais são `/guia`, `/magias`, `/armas`, `/personagens`, `/turno`, `/busca` e `/monstros`.

## Execução

Requer Node.js compatível com Angular 20.

```bash
npm install
npm start
```

A aplicação fica disponível em `http://localhost:4200`.

## Validação

```bash
npm run test:data
npm run audit:handbook
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

`test:data` verifica IDs, referências, 12 classes, 48 subclasses, 10 espécies, 16 antecedentes, características até o nível 8, concessões de magia e formas animais. `audit:handbook` regenera a matriz de cobertura comparando os dados atuais com a branch `dev`.

## Armazenamento e compatibilidade

Novos personagens usam atributos base somados aos bônus de antecedente e talentos. Dados v1 são copiados para `dnd.turn-planner.backup.v1` antes da migração e mantêm os atributos finais no modo legado, sem reaplicar bônus. Trocas de nível, classe ou opção mantêm escolhas incompatíveis visíveis até o usuário revisá-las.

A etapa de atributos oferece Livre (inteiros de 1 a 20), Dice roll (seis rolagens de 4d6 descartando um menor dado), Array (15, 14, 13, 12, 10 e 8) e Point buy (27 pontos; base de 8 a 15, com custos 0/1/2/3/4/5/7/9). Array permite trocar valores entre atributos. Na rolagem, os seis resultados ficam em uma reserva para distribuição manual; cada ocorrência pode ser usada uma vez, e liberar um atributo devolve seu resultado à reserva. A compra bloqueia aumentos acima do orçamento e exige distribuir os 27 pontos para avançar ou salvar. Trocar para Array ou Point buy reinicia apenas os atributos base; o modo Livre mantém os valores atuais. O método e os dados rolados ficam em `abilityGeneration` na exportação v2. Personagens sem esse campo usam Livre ao editar atributos base; valores finais legados permanecem preservados.

## Escopo e limites

O Livro do Jogador PDF presente localmente é a referência de nomes, páginas e regras; ele não é empacotado no build. A cobertura desta versão termina no nível total 8. Magias de círculos superiores continuam disponíveis para consulta, mas não podem ser preparadas por esses personagens.

Características cujo resultado depende do Mestre, do cenário ou de um alvo recebem orientação e confirmação de contexto. A aplicação não calcula uma ficha completa de pontos de vida, Classe de Armadura ou inventário, e não inclui backend, autenticação ou publicação.
## Direção visual em feat-2

Motion (`motion/mini`) adiciona transições de até 200 ms às etapas do criador, abertura e filtros da galeria, seleção de retratos/personagens, menu móvel e avisos do combate. Contadores de recursos recebem feedback apenas quando mudam. A diretiva compartilhada `UiMotionDirective` executa fora da detecção de mudanças do Angular, cancela animações ao desmontar e respeita `prefers-reduced-motion`, inclusive quando a preferência muda durante uma animação. Navegação, foco e regras não dependem da duração dos efeitos.

Interface com molduras de fantasia, navegação escura, superfícies de pergaminho e cards ilustrados para classes e personagens. Os retratos são obras de artistas de The Battle for Wesnoth 1.18, Paper Mage e PrintableHeroes; os créditos estão em `public/assets/art/credits.html`, acessíveis pelo rodapé da navegação e pelo seletor de retratos. Os retratos Wesnoth não foram alterados. As miniaturas Paper Mage receberam remoção de fundo e recorte no torso; suas fontes estão em `scripts/papermage-sources.json`. Os retratos PrintableHeroes usam a transparência original dos PDFs gratuitos, com recorte da frente no torso. Nenhuma imagem gerada por IA integra esta versão.

A primeira etapa do criador permite escolher um retrato entre 413 ilustrações (361 PrintableHeroes, 17 Paper Mage e 35 Wesnoth), com filtros por coleção, estilo de classe, origem e aparência. Cada estilo de classe possui alternativas masculinas e femininas; as origens disponíveis são humano, elfo, anão, orc, aasimar, gnomo, pequenino, draconato, tiferino e golias. A coleção ainda não oferece todas as combinações de origem, classe e aparência. O campo opcional `portraitId` é preservado em armazenamento e exportação v2. Perfis antigos continuam com a imagem automática da primeira classe; IDs indisponíveis são preservados e recebem indicação de revisão no seletor. Novas fontes de imagens devem ser apresentadas ao usuário antes de sua incorporação.

Para reproduzir os retratos Paper Mage, execute `python scripts/prepare-papermage.py --download` com Pillow e pypdf instalados. Os PDFs originais ficam no diretório temporário; o script gera os WebP transparentes, o catálogo TypeScript e o registro público das fontes.

Para reproduzir PrintableHeroes, execute em sequência `python scripts/sync-printableheroes.py`, `python scripts/prepare-printableheroes.py --download` e `python scripts/catalog-printableheroes.py`, com Pillow, pypdf, pypdfium2 e NumPy instalados. A sincronização consulta apenas arquivos públicos do nível gratuito (tier 0), sem conta ou assinatura. Os manifestos em `scripts/printableheroes-*-sources.json` registram os PDFs; `public/assets/art/printableheroes-sources.json` liga cada retrato à fonte. Originais, relatórios de extração e folhas de revisão ficam em `%TEMP%/dnd-printableheroes`. Versos, desenhos monocromáticos, criaturas sem origem aplicável e duplicatas exatas não entram na galeria. As condições de uso de cada autor são mantidas nos créditos.
# Consulta de personagens

Os cartões da biblioteca e dos exemplos oferecem **Ver ficha**, na rota `/personagens/:id`. A ficha é somente de consulta: usa os atributos finais salvos, separa o grimório das magias disponíveis, apresenta talentos, características adquiridas e a capacidade máxima dos recursos. Os usos durante o combate continuam no auxiliar de turnos. A ficha pode ser aberta em outra aba a partir do personagem ativo.

No criador, **entender e comparar** permite consultar duas classes, subclasses ou talentos lado a lado sem alterar a seleção. As características até o nível 8 indicam as concessões futuras, com referências de página e pré-requisitos do catálogo. O criador registra perícias por origem (classe inicial, multiclasse, espécie, talentos e características), valida limites e requisitos de Especialização e preserva escolhas incompatíveis para revisão. A ficha apresenta as 18 perícias, atributo associado, bônus total e origem, incluindo Pau pra Toda Obra, Taumaturgo, Xamã e Glamour Transcendental. Habilidoso permite combinar perícias e ferramentas. As escolhas adicionais são preservadas em `skillSelections` no armazenamento/exportação v2; personagens anteriores continuam acessíveis e indicam pendências até a revisão explícita.
