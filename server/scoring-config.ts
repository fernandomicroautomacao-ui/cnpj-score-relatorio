/** Regras comerciais editáveis sem IA. Ajuste este arquivo para calibrar o motor. */
export const SCORING_RULES = {
  capitalSocial: { grandeMin: 10_000_000, mediaMin: 1_000_000, semInformacaoPontos: 1 },
  situacao: { ativaKeywords: ["ATIV", "REGULAR"], ativaPontos: 1, inativaPontos: 0 },
  categoria: { industrialPontos: 3, intermediariaPontos: 2, semClassificacaoPontos: 1 },
  geografia: { hubProximoKm: 180, regiaoSecundariaKm: 320 },
  ddd: { mesmoDddPontos: 3, mesmoEstadoPontos: 2, outroPontos: 1, dddsSaoPaulo: ["11", "12", "13", "14", "15", "16", "17", "18", "19"] },
  cnaeCategoriaAKeywords: ["INDUSTR", "FABRIC", "MANUF", "PRODUC", "METAL", "MECAN", "QUIM", "PLAST", "ALIMENT"],
  pontuacaoMinimaExterna: 8,
  hubs: { marilia: "Marília", ribeiraoPreto: "Ribeirão Preto" },
} as const;
