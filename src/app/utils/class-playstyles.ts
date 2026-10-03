import { TurnClassId } from '../models/turn-planner.models';

export interface ClassPlaystyle {
  enjoy: string;
  strengths: string;
  play: string;
  tradeoff: string;
}

/** Guidance about the play experience, separate from the book's rule descriptions. */
export const CLASS_PLAYSTYLES: Record<TurnClassId, ClassPlaystyle> = {
  barbaro: {
    enjoy: 'Entrar na linha de frente, bater forte e enfrentar o perigo de perto.',
    strengths: 'Combate corpo a corpo, resistência e desafios de força.',
    play: 'Entra em Fúria, aproxima-se dos inimigos e usa ataques agressivos. Precisa decidir quando vale se expor para aumentar a pressão.',
    tradeoff: 'Quem quer muitas magias ou prefere resolver o combate à distância.',
  },
  bardo: {
    enjoy: 'Improvisar, conversar e ajudar o grupo a superar situações diferentes.',
    strengths: 'Interação social, perícias e apoio com magias e Inspiração.',
    play: 'Alterna entre fortalecer aliados, atrapalhar inimigos e resolver problemas fora do combate. A escolha das magias define bastante seu papel.',
    tradeoff: 'Quem quer uma função muito fixa e poucas decisões por turno.',
  },
  bruxo: {
    enjoy: 'Poderes sobrenaturais, pactos e personalizar bastante suas habilidades.',
    strengths: 'Combinar truques, invocações e poucos usos de magia de grande impacto.',
    play: 'Usa seus poderes recorrentes como base e escolhe momentos importantes para gastar os espaços de Magia de Pacto. Algumas construções também lutam de perto.',
    tradeoff: 'Quem quer lançar muitas magias diferentes entre descansos.',
  },
  clerigo: {
    enjoy: 'Proteger o grupo e exercer poder divino, sem ficar limitado a curar.',
    strengths: 'Apoio, recuperação e magias que também podem causar dano ou controlar o combate.',
    play: 'Escolhe entre ajudar aliados, pressionar inimigos e manter uma magia importante ativa. O domínio muda bastante sua atuação.',
    tradeoff: 'Quem não quer administrar magias e necessidades do grupo.',
  },
  druida: {
    enjoy: 'Natureza, transformação e encontrar soluções pouco convencionais.',
    strengths: 'Controle de terreno, exploração e versatilidade com magias e Forma Selvagem.',
    play: 'Interfere no campo de batalha e usa transformações conforme a situação. A subclasse define quanto o combate depende da forma animal.',
    tradeoff: 'Quem prefere acompanhar poucas regras e opções.',
  },
  feiticeiro: {
    enjoy: 'Ter magia como poder próprio e modificar a maneira de lançá-la.',
    strengths: 'Adaptar magias com Metamagia e executar combinações planejadas.',
    play: 'Escolhe uma magia adequada e decide se vale gastar Pontos de Feitiçaria para alterar seu uso.',
    tradeoff: 'Quem prefere um repertório preparado para qualquer situação, como o de um mago.',
  },
  guardiao: {
    enjoy: 'Ser um aventureiro entre Guerreiro e Druida, capaz de lutar com armas e usar magia da natureza para ajudar o grupo.',
    strengths: 'Combinar combate, exploração e apoio. Pode causar dano consistente enquanto oferece rastreamento, furtividade, cura e outras soluções mágicas.',
    play: 'Atua principalmente como combatente, de perto ou à distância, e complementa seus ataques com magia. Fora do combate, ajuda o grupo a encontrar caminhos, reconhecer perigos e sobreviver em ambientes hostis.',
    tradeoff: 'Quem busca a especialização marcial de um Guerreiro ou quer fazer da magia e da transformação o centro do personagem, como um Druida.',
  },
  guerreiro: {
    enjoy: 'Dominar armas e decidir como enfrentar cada inimigo.',
    strengths: 'Ataques consistentes, variedade de equipamentos e momentos de grande pressão.',
    play: 'Usa posicionamento e maestrias para tornar seus ataques mais úteis. Guarda o Surto de Ação para uma oportunidade decisiva.',
    tradeoff: 'Quem busca magia como parte central da classe; isso depende da subclasse.',
  },
  ladino: {
    enjoy: 'Infiltração, precisão e ser a pessoa que resolve problemas com perícias.',
    strengths: 'Especialização, furtividade e ataques certeiros.',
    play: 'Procura condições para aplicar Ataque Furtivo e usa mobilidade, esconderijos e aliados para conseguir boas oportunidades.',
    tradeoff: 'Quem quer permanecer parado na linha de frente trocando golpes.',
  },
  mago: {
    enjoy: 'Estudar possibilidades e ter uma magia adequada para muitos problemas.',
    strengths: 'Variedade de magias, rituais e controle do combate.',
    play: 'Prepara seu repertório, observa a situação e escolhe efeitos que podem mudar o rumo da luta. Posicionamento e proteção são importantes.',
    tradeoff: 'Quem quer pouca leitura ou prefere decidir tudo na hora, sem preparação.',
  },
  monge: {
    enjoy: 'Artes marciais, velocidade e combater sem depender de armaduras pesadas.',
    strengths: 'Mobilidade, sequência de golpes e pressão sobre inimigos específicos.',
    play: 'Aproxima-se rapidamente, combina ataques e técnicas e decide quando gastar Foco para atacar, defender-se ou se movimentar.',
    tradeoff: 'Quem quer absorver golpes como um bárbaro ou usar equipamentos pesados.',
  },
  paladino: {
    enjoy: 'Ser um combatente guiado por um juramento e proteger quem luta ao seu lado.',
    strengths: 'Combate corpo a corpo, proteção e apoio ao grupo.',
    play: 'Avança com os aliados, combina ataques com magia e decide quando gastar recursos em punições ou recuperação.',
    tradeoff: 'Quem prefere ficar longe do grupo ou lutar principalmente à distância.',
  },
};
