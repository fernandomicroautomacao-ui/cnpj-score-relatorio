import PDFDocument from "pdfkit";
import { SCORING_RULES } from "./scoring-config";

export type CnpjResult = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;
  capitalSocial: number | null;
  porte: string;
  cnaePrincipal: string;
  atividadePrincipal: string;
  cidade: string;
  uf: string;
  endereco: string;
  score: number;
  scoreDetalhes: { criterio: string; resultado: string; pontos: number }[];
  vendedor: string;
  hubMaisProximo: string;
  distanciaMariliaKm: number | null;
  distanciaRibeiraoKm: number | null;
  explicacao: string;
};

export type CnpjOverrides = Partial<Pick<CnpjResult, "razaoSocial" | "nomeFantasia" | "situacao" | "capitalSocial" | "cnaePrincipal" | "atividadePrincipal" | "cidade" | "uf" | "endereco">>;

const HUBS = {
  Marília: { lat: -22.2139, lon: -49.9458 },
  "Ribeirão Preto": { lat: -21.1775, lon: -47.8103 },
};

const CITY_COORDS: Record<string, [number, number]> = {
  "MARILIA": [-22.2139, -49.9458], "RIBEIRAO PRETO": [-21.1775, -47.8103], "BAURU": [-22.3246, -49.0871], "ARARAQUARA": [-21.7946, -48.1756], "SAO CARLOS": [-22.0174, -47.8908], "CAMPINAS": [-22.9056, -47.0608], "SAO PAULO": [-23.5505, -46.6333], "BAREURI": [-23.5112, -46.8765], "BARUERI": [-23.5112, -46.8765], "FRANCA": [-20.5397, -47.4008], "SERTAOZINHO": [-21.1356, -47.9903], "CATANDUVA": [-21.1378, -48.9728], "SAO JOSE DO RIO PRETO": [-20.8113, -49.3758], "PIRACICABA": [-22.7338, -47.6476], "BOTUCATU": [-22.8858, -48.445], "ASSIS": [-22.6617, -50.4122], "JAU": [-22.2965, -48.5578], "ARACATUBA": [-21.2076, -50.4401], "BIRIGUI": [-21.2928, -50.3406], "VOTUPORANGA": [-20.4237, -49.9781], "RIO CLARO": [-22.4113, -47.5613], "PORTO FERREIRA": [-21.8539, -47.4792], "MIRASSOL": [-20.8197, -49.5204], "MATAO": [-21.6033, -48.3658], "OLIMPIA": [-20.7372, -48.9147], "PENAPOLIS": [-21.4197, -50.0774], "LINS": [-21.6786, -49.7425], "TUPA": [-21.9347, -50.5136], "PIRAJU": [-23.1981, -49.3839], "MOGI GUACU": [-22.3722, -46.9422], "MOGI MIRIM": [-22.4333, -46.9578], "DESCALVADO": [-21.9039, -47.6194], "PINDORAMA": [-21.1856, -48.9072], "MONTE ALTO": [-21.2611, -48.4964], "CRAVINHOS": [-21.3403, -47.7294], "JARDINOPOLIS": [-21.0178, -47.7639], "PITANGUEIRAS": [-21.0094, -48.2217], "ITARARE": [-24.1125, -49.3353], "VOTORANTIM": [-23.5467, -47.4378], "CABREUVA": [-23.3075, -47.1328], "DRACENA": [-21.4833, -51.5342],
};

export function onlyDigits(value: string) { return value.replace(/\D/g, ""); }
export function isValidCnpj(value: string) {
  const c = onlyDigits(value);
  if (c.length !== 14 || /^([0-9])\1+$/.test(c)) return false;
  const calc = (base: string) => {
    let factor = base.length - 7; let sum = 0;
    for (const digit of base) { sum += Number(digit) * factor; factor--; if (factor === 1) factor = 9; }
    const rest = sum % 11; return rest < 2 ? 0 : 11 - rest;
  };
  return calc(c.slice(0, 12)) === Number(c[12]) && calc(c.slice(0, 13)) === Number(c[13]);
}

function text(...values: unknown[]) { return values.find(v => typeof v === "string" && v.trim())?.toString().trim() ?? ""; }
function numberValue(...values: unknown[]) { for (const v of values) { const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".")); if (Number.isFinite(n) && n > 0) return n; } return null; }
function normCity(c: string) { return c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim(); }
function haversine(a: [number, number], b: { lat: number; lon: number }) { const R=6371; const toRad=(x:number)=>x*Math.PI/180; const dLat=toRad(b.lat-a[0]); const dLon=toRad(b.lon-a[1]); const lat1=toRad(a[0]); const lat2=toRad(b.lat); const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2; return Math.round(R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))); }

function extract(payload: any, cnpj: string): any {
  const company = payload?.company ?? payload?.establishment?.company ?? payload ?? {};
  const office = payload?.office ?? payload?.establishment ?? payload ?? {};
  const address = office.address ?? payload?.address ?? {};
  const mainActivity = office.mainActivity ?? company.mainActivity ?? office.primaryActivity ?? {};
  return {
    cnpj, razaoSocial: text(company.name, payload.name, office.company?.name, payload.razaoSocial) || "Empresa não identificada",
    nomeFantasia: text(office.alias, payload.alias, payload.nomeFantasia), situacao: text(office.status?.text, office.status, payload.status?.text, payload.status) || "Não informada",
    capitalSocial: numberValue(company.equity, company.capitalSocial, payload.equity, payload.capitalSocial), porteRaw: text(company.size?.text, company.size, payload.size),
    cnae: text(mainActivity.id, mainActivity.code, office.mainActivity?.id, payload.cnaePrincipal), atividade: text(mainActivity.text, mainActivity.description, payload.atividadePrincipal),
    cidade: text(address.city, office.address?.city, payload.city), uf: text(address.state, address.uf, payload.uf), endereco: [address.street, address.number, address.district, address.city, address.state].filter(Boolean).join(", "),
    lat: Number(payload.geocoding?.latitude ?? payload.latitude ?? office.geocoding?.latitude), lon: Number(payload.geocoding?.longitude ?? payload.longitude ?? office.geocoding?.longitude),
  };
}

export function scoreCompany(raw: any, cnpj: string, overrides: CnpjOverrides = {}): CnpjResult {
  const base = extract(raw, cnpj); const p = { ...base, ...overrides, cnae: overrides.cnaePrincipal ?? base.cnae, atividade: overrides.atividadePrincipal ?? base.atividade }; const city = normCity(p.cidade); const details: CnpjResult["scoreDetalhes"] = [];
  const status = p.situacao.toUpperCase(); const active = SCORING_RULES.situacao.ativaKeywords.some(keyword => status.includes(keyword)); details.push({ criterio: "Situação cadastral", resultado: active ? "Ativa/regular" : p.situacao, pontos: active ? SCORING_RULES.situacao.ativaPontos : SCORING_RULES.situacao.inativaPontos });
  const equity = p.capitalSocial ?? 0; const sizePts = p.capitalSocial == null ? SCORING_RULES.capitalSocial.semInformacaoPontos : equity >= SCORING_RULES.capitalSocial.grandeMin ? 3 : equity >= SCORING_RULES.capitalSocial.mediaMin ? 2 : 1; const porte = equity >= SCORING_RULES.capitalSocial.grandeMin ? "Grande" : equity >= SCORING_RULES.capitalSocial.mediaMin ? "Média" : "Pequena"; details.push({ criterio: "Capital social / porte inferido", resultado: p.capitalSocial == null ? "Não informado; faixa conservadora" : `R$ ${equity.toLocaleString("pt-BR",{minimumFractionDigits:2})} · ${porte}`, pontos: sizePts });
  const industrial = SCORING_RULES.cnaeCategoriaAKeywords.some(keyword => `${p.cnae} ${p.atividade}`.toUpperCase().includes(keyword)); const categoryPts = industrial ? SCORING_RULES.categoria.industrialPontos : p.cnae || p.atividade ? SCORING_RULES.categoria.intermediariaPontos : SCORING_RULES.categoria.semClassificacaoPontos; details.push({ criterio: "Aderência por CNAE", resultado: industrial ? "Categoria A · industrial/produção" : "Categoria B · mercado intermediário", pontos: categoryPts });
  const coords: [number, number] | null = Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.lat !== 0 && p.lon !== 0 ? [p.lat,p.lon] : CITY_COORDS[city] ?? null;
  const marKm = coords ? haversine(coords,HUBS.Marília) : null; const rpKm = coords ? haversine(coords,HUBS["Ribeirão Preto"]) : null; const near = marKm != null && rpKm != null ? (marKm <= rpKm ? "Marília" : "Ribeirão Preto") : "não calculado"; const geoPts = coords ? (Math.min(marKm!,rpKm!) <= SCORING_RULES.geografia.hubProximoKm ? 3 : Math.min(marKm!,rpKm!) <= SCORING_RULES.geografia.regiaoSecundariaKm ? 2 : 1) : 1;
  details.push({ criterio: "Geografia", resultado: coords ? `${near} é o hub mais próximo` : "Cidade sem coordenada cadastrada", pontos: geoPts });
  const score = details.reduce((s,d)=>s+d.pontos,0); let vendedor = "Vendedor Interno Online"; if (score >= SCORING_RULES.pontuacaoMinimaExterna && near === "Marília") vendedor = "Vendedor Externo — Hub Marília"; else if (score >= SCORING_RULES.pontuacaoMinimaExterna && near === "Ribeirão Preto") vendedor = "Vendedor Externo — Hub Ribeirão Preto";
  const reason = `${p.razaoSocial} soma ${score} pontos: ${details.map(d => `${d.criterio}: ${d.pontos} ponto(s)`).join("; ")}. ${near === "não calculado" ? "A distância não pôde ser calculada com os dados disponíveis." : `Distâncias: Marília ${marKm} km e Ribeirão Preto ${rpKm} km; ${near} é o hub mais próximo.`} Recomendação: ${vendedor}.`;
  return { cnpj, razaoSocial: p.razaoSocial, nomeFantasia: p.nomeFantasia, situacao: p.situacao, capitalSocial: p.capitalSocial, porte, cnaePrincipal: p.cnae, atividadePrincipal: p.atividade, cidade: p.cidade, uf: p.uf, endereco: p.endereco, score, scoreDetalhes: details, vendedor, hubMaisProximo: near, distanciaMariliaKm: marKm, distanciaRibeiraoKm: rpKm, explicacao: reason };
}

export async function fetchCnpj(cnpj: string, apiKey?: string, overrides: CnpjOverrides = {}): Promise<CnpjResult> {
  const clean = onlyDigits(cnpj);
  if (!isValidCnpj(clean)) throw new Error("CNPJ inválido. Confira os 14 dígitos informados.");
  const url = apiKey ? `https://api.cnpja.com/office/${clean}` : `https://open.cnpja.com/office/${clean}`;
  const response = await fetch(url, { headers: apiKey ? { Authorization: apiKey } : {} });
  if (!response.ok) throw new Error(`CNPJá retornou HTTP ${response.status}.`);
  return scoreCompany(await response.json(), clean, overrides);
}

export function createPdf(results: CnpjResult[]) {
  const doc = new PDFDocument({ margin: 42, size: "A4" });
  doc.fontSize(20).fillColor("#16324F").text("CNPJ Score & Roteamento Comercial");
  doc.fontSize(9).fillColor("#5E7184").text(`Relatório determinístico · ${new Date().toLocaleString("pt-BR")}`);
  results.forEach((r, i) => {
    if (i > 0) doc.addPage();
    doc.moveDown(1).fontSize(16).fillColor("#16324F").text(r.razaoSocial);
    doc.fontSize(10).fillColor("#263B4D").text(`CNPJ: ${r.cnpj}   |   Situação: ${r.situacao}`);
    doc.moveDown(.6).fontSize(12).fillColor("#0F766E").text(`Recomendação: ${r.vendedor}`);
    doc.fontSize(10).fillColor("#263B4D").text(`Pontuação: ${r.score} pontos   |   Hub mais próximo: ${r.hubMaisProximo}`);
    doc.moveDown(.4).text(`Capital social: ${r.capitalSocial == null ? "Não informado" : `R$ ${r.capitalSocial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}   |   Porte inferido: ${r.porte}`);
    doc.text(`Endereço: ${r.endereco || "Não informado"}`);
    doc.text(`Distância Marília: ${r.distanciaMariliaKm == null ? "n/d" : `${r.distanciaMariliaKm} km`}   |   Distância Ribeirão Preto: ${r.distanciaRibeiraoKm == null ? "n/d" : `${r.distanciaRibeiraoKm} km`}`);
    doc.moveDown(.8).fontSize(11).fillColor("#16324F").text("Memória de cálculo");
    r.scoreDetalhes.forEach(d => doc.fontSize(9).fillColor("#263B4D").text(`• ${d.criterio}: ${d.resultado} — ${d.pontos} ponto(s)`));
    doc.moveDown(.8).fontSize(10).text(r.explicacao);
  });
  doc.end();
  return doc;
}
