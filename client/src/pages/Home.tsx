import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Building2, CheckCircle2, FileDown, FileUp, Gauge, MapPin, Upload, Waypoints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canAnalyzeIndividual, maskCnpj, onlyDigits, parseCnpjList } from "@/lib/cnpj-input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Hub = { nome:string; cidade:string; uf:string; ddd:string; lat:number; lon:number };
type Result = { cnpj:string; razaoSocial:string; nomeFantasia:string; situacao:string; capitalSocial:number|null; porte:string; cnaePrincipal:string; atividadePrincipal:string; cidade:string; uf:string; endereco:string; ddd:string; score:number; scoreDetalhes:{criterio:string;resultado:string;pontos:number}[]; vendedor:string; hubMaisProximo:string; distanciaMariliaKm:number|null; distanciaRibeiraoKm:number|null; distanciasHubs:{nome:string;distanciaKm:number}[]; explicacao:string };
type Editable = Pick<Result, "razaoSocial" | "nomeFantasia" | "situacao" | "capitalSocial" | "cnaePrincipal" | "atividadePrincipal" | "cidade" | "uf" | "endereco">;
const money = (value:number|null) => value == null ? "Não informado" : value.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const tone = (vendor:string) => vendor.includes("Marília") ? "bg-[#e8f5f2] text-[#0f766e]" : vendor.includes("Ribeirão") ? "bg-[#eaf2f9] text-[#2b6495]" : "bg-[#fff5df] text-[#9a6814]";

export default function Home() {
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");
  const [tab, setTab] = useState("individual");
  const [results, setResults] = useState<Result[]>([]);
  const [draft, setDraft] = useState<Editable | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [newHub, setNewHub] = useState<Hub>({ nome:"", cidade:"", uf:"SP", ddd:"", lat:0, lon:0 });
  const [netlifyBusy, setNetlifyBusy] = useState(false);
  const [netlifyReportBusy, setNetlifyReportBusy] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const useNetlify = import.meta.env.VITE_DEPLOY_TARGET === "netlify";
  const rawBulk = useMemo(() => bulk.split(/[\n,;]+/).map(onlyDigits).filter(Boolean), [bulk]);
  const current = useMemo(() => tab === "individual" ? (single ? [single] : []) : parseCnpjList(bulk), [single, bulk, tab]);
  const busy = netlifyBusy;

  const analyze = trpc.cnpj.analyze.useMutation({
    onSuccess: data => { setResults(data.results as Result[]); data.errors.length ? toast.error(`${data.errors.length} CNPJ(s) não puderam ser consultados.`) : toast.success(`${data.results.length} consulta(s) concluída(s).`); },
    onError: error => toast.error(error.message),
  });
  const lookup = trpc.cnpj.lookup.useMutation({
    onSuccess: data => { setDraft(toDraft(data as Result)); toast.success("Dados carregados. Revise ou corrija antes de analisar."); },
    onError: error => toast.error(error.message),
  });
  const report = trpc.cnpj.report.useMutation({
    onSuccess: data => downloadBase64(data.data, data.filename),
    onError: error => toast.error(error.message),
  });

  async function lookupCnpj() {
    if (onlyDigits(single).length !== 14) return toast.error("Informe um CNPJ com 14 dígitos.");
    if (!useNetlify) return lookup.mutate({ cnpj: single });
    setNetlifyBusy(true);
    try {
      const response = await fetch("/api/lookup", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ cnpj:single }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao buscar CNPJ.");
      setDraft(toDraft(data as Result)); toast.success("Dados carregados. Revise ou corrija antes de analisar.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao buscar CNPJ."); } finally { setNetlifyBusy(false); }
  }

  async function submit() {
    if (!current.length) return toast.error("Informe ao menos um CNPJ.");
    if (tab === "lote" && rawBulk.length > 5) return toast.error("A API Pública aceita no máximo 5 CNPJs por minuto. Reduza o lote e tente novamente.");
    if (tab === "individual" && !canAnalyzeIndividual(single, Boolean(draft))) return toast.error(onlyDigits(single).length !== 14 ? "Informe um CNPJ com 14 dígitos." : "Busque e confirme os dados cadastrais antes de analisar.");
    const payload = { cnpjs:current, overrides:tab === "individual" ? draft ?? undefined : undefined, hubs };
    if (!useNetlify) return analyze.mutate(payload);
    setNetlifyBusy(true);
    try {
      const response = await fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao analisar CNPJ.");
      setResults(data.results); toast.success(`${data.results.length} consulta(s) concluída(s).`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao analisar CNPJ."); } finally { setNetlifyBusy(false); }
  }

  async function exportPdf() {
    if (!results.length) return toast.error("Consulte pelo menos um CNPJ antes de exportar.");
    const payload = { cnpjs:results.map(result => result.cnpj), overrides:draft ?? undefined, hubs };
    if (!useNetlify) return report.mutate(payload);
    setNetlifyReportBusy(true);
    try {
      const response = await fetch("/api/report", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Falha ao gerar PDF."); }
      const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "relatorio-cnpj.pdf"; anchor.click(); URL.revokeObjectURL(url); toast.success("Relatório PDF baixado.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao gerar PDF."); } finally { setNetlifyReportBusy(false); }
  }

  function importFile(file?:File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const content = String(reader.result ?? ""); setBulk(content); const count = content.split(/[\n,;]+/).map(onlyDigits).filter(Boolean).length; count > 5 ? toast.error("Arquivo carregado, mas a API Pública permite analisar somente 5 CNPJs por minuto.") : toast.success(`${file.name} carregado.`); };
    reader.readAsText(file, "UTF-8");
  }

  function addHub() {
    if (!newHub.nome.trim() || !Number.isFinite(newHub.lat) || !Number.isFinite(newHub.lon) || newHub.lat === 0 || newHub.lon === 0) return toast.error("Informe nome, latitude e longitude válidos para o hub.");
    if (hubs.length >= 10) return toast.error("O limite é de dez hubs adicionais.");
    if (hubs.some(hub => hub.nome.trim().toLowerCase() === newHub.nome.trim().toLowerCase())) return toast.error("Já existe um hub com esse nome.");
    setHubs(currentHubs => [...currentHubs, { ...newHub, nome:newHub.nome.trim(), cidade:newHub.cidade.trim(), uf:newHub.uf.trim().toUpperCase() }]);
    setNewHub({ nome:"", cidade:"", uf:"SP", ddd:"", lat:0, lon:0 });
    toast.success("Hub adicionado à comparação.");
  }

  return <div className="min-h-screen bg-[#f5f7f8] text-[#102a43]">
    <header className="sticky top-0 z-10 border-b border-[#d9e4ea] bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4"><div className="flex items-center gap-3"><div className="brand-mark"><Waypoints size={19}/></div><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#5f7d8d]">Inteligência comercial</p><h1 className="text-lg font-bold tracking-tight">Análise Carteira <span className="font-light text-[#5f7d8d]">Micro Automação Campinas</span></h1></div></div><Badge variant="outline" className="hidden rounded-full border-[#cfe2e4] bg-[#f2fbfa] px-3 py-1 text-[#0f766e] sm:flex">Motor determinístico ativo</Badge></div></header>
    <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-7 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_390px]"><section>
      <div className="mb-8 max-w-3xl"><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#0f766e]"><span className="h-px w-8 bg-[#0f766e]"/>análise comercial</p><h2 className="text-4xl font-bold leading-[1.06] tracking-[-.04em] sm:text-5xl">Carteira priorizada<br/><span className="text-[#0f766e]">por dados e critérios.</span></h2><p className="mt-5 max-w-xl text-base leading-7 text-[#5f7281]">Consulte dados públicos de CNPJ, revise o cadastro e aplique critérios auditáveis de porte, CNAE, geografia, DDD e hubs para orientar o atendimento.</p></div>
      <Card className="overflow-hidden rounded-2xl border-[#d9e4ea] bg-white shadow-[0_20px_60px_rgba(16,42,67,.07)]"><CardHeader className="border-b border-[#edf2f4] px-6 pb-0 pt-6"><div className="flex items-start justify-between"><div><CardTitle className="text-xl">Nova análise</CardTitle><p className="mt-1 text-sm text-[#718596]">Dados públicos → revisão → recomendação</p></div><div className="rounded-xl bg-[#e8f5f2] p-3 text-[#0f766e]"><Gauge size={22}/></div></div><Tabs value={tab} onValueChange={setTab} className="mt-6"><TabsList className="h-11 w-full justify-start gap-6 rounded-none bg-transparent p-0"><TabsTrigger value="individual" className="rounded-none border-b-2 border-transparent bg-transparent px-0 data-[state=active]:border-[#0f766e] data-[state=active]:text-[#0f766e]">Consulta individual</TabsTrigger><TabsTrigger value="lote" className="rounded-none border-b-2 border-transparent bg-transparent px-0 data-[state=active]:border-[#0f766e] data-[state=active]:text-[#0f766e]">Importar em lote</TabsTrigger></TabsList></Tabs></CardHeader><CardContent className="p-6"><Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="individual" className="mt-0"><FieldLabel> CNPJ da empresa </FieldLabel><div className="flex gap-3"><Input value={single} onChange={event=>{setSingle(maskCnpj(event.target.value));setDraft(null)}} onKeyDown={event=>event.key === "Enter" && lookupCnpj()} placeholder="00.000.000/0001-00" className="h-12 rounded-xl border-[#d9e4ea] bg-[#fbfcfc] text-base"/><Button onClick={lookupCnpj} disabled={lookup.isPending || busy} className="h-12 rounded-xl bg-[#102a43] px-6 text-white hover:bg-[#1b425f]">{lookup.isPending || busy ? "Buscando…" : "Buscar dados"}<ArrowUpRight size={17}/></Button></div><p className="mt-3 text-xs text-[#91a3af]">A consulta utiliza somente a API Pública do CNPJá e não requer chave.</p>{draft && <ReviewForm draft={draft} onChange={setDraft} onAnalyze={submit} busy={analyze.isPending || busy}/>}</TabsContent>
        <TabsContent value="lote" className="mt-0"><FieldLabel>Lista de CNPJs</FieldLabel><textarea value={bulk} onChange={event=>setBulk(event.target.value)} placeholder="Um CNPJ por linha, ou separados por vírgula" className="min-h-28 w-full rounded-xl border border-[#d9e4ea] bg-[#fbfcfc] p-3 text-sm outline-none ring-[#0f766e] focus:ring-2"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-[#718596]"><Upload size={14}/> Máximo de 5 CNPJs por minuto</span><div className="flex gap-2"><input ref={upload} type="file" accept=".csv,.txt" className="hidden" onChange={event=>importFile(event.target.files?.[0])}/><Button variant="outline" onClick={()=>upload.current?.click()} className="h-11 rounded-xl border-[#cbdde2] bg-white"><FileUp size={16}/> Importar arquivo</Button><Button onClick={submit} disabled={analyze.isPending || busy} className="h-11 rounded-xl bg-[#102a43] px-6 text-white hover:bg-[#1b425f]">{analyze.isPending || busy ? "Processando…" : "Analisar lote"}<ArrowUpRight size={17}/></Button></div></div></TabsContent>
      </Tabs></CardContent></Card>
      <HubManager hubs={hubs} newHub={newHub} onChange={setNewHub} onAdd={addHub} onRemove={(name:string)=>setHubs(currentHubs=>currentHubs.filter(hub=>hub.nome!==name))}/>
      <p className="mt-5 text-xs leading-5 text-[#718596]">A API Pública do CNPJá permite cinco consultas por minuto por endereço IP. Aguarde um minuto antes de enviar o próximo lote.</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><Metric label="Motor" value="100%" note="sem IA" icon={<Gauge size={17}/>}/><Metric label="Critérios" value="05" note="auditáveis" icon={<CheckCircle2 size={17}/>}/><Metric label="Hubs" value={String(2 + hubs.length).padStart(2, "0")} note="comparados" icon={<MapPin size={17}/>}/></div>
      {results.length > 0 && <div className="mt-10"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#718596]">Resultado da análise</p><h3 className="mt-1 text-2xl font-bold">{results.length} empresa{results.length > 1 ? "s" : ""} consultada{results.length > 1 ? "s" : ""}</h3></div><Button onClick={exportPdf} variant="outline" disabled={report.isPending || netlifyReportBusy} className="rounded-xl border-[#cbdde2] bg-white"><FileDown size={16}/>{report.isPending || netlifyReportBusy ? "Gerando PDF…" : "Baixar relatório PDF"}</Button></div><div className="space-y-4">{results.map(result=><ResultCard key={result.cnpj} result={result}/>)}</div></div>}
    </section><aside className="space-y-5"><Card className="rounded-2xl border-0 bg-[#102a43] text-white shadow-[0_18px_45px_rgba(16,42,67,.18)]"><CardContent className="p-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#8fcfc4]">Como funciona</p><h3 className="mt-4 text-2xl font-bold leading-tight">Cada recomendação<br/>vem com a sua prova.</h3><div className="mt-7 space-y-5">{["Consulta pública no CNPJá","Revisão cadastral editável","Pontuação por regra fixa","Distância entre os hubs"].map((item,index)=><div key={item} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-[#8fcfc4]">0{index+1}</span><p className="pt-1 text-sm text-[#d6e4ea]">{item}</p></div>)}</div></CardContent></Card><Card className="rounded-2xl border-[#d9e4ea] bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 size={17} className="text-[#0f766e]"/>Hubs de atendimento</CardTitle></CardHeader><CardContent className="space-y-4 pt-0"><HubRow name="Marília / SP" desc="Hub oeste" color="bg-[#0f9b8e]"/><HubRow name="Ribeirão Preto / SP" desc="Hub norte" color="bg-[#4685b8]"/><Separator/><p className="text-xs leading-5 text-[#718596]">A distância é usada como critério geográfico. O porte e a aderência definem se a visita externa é economicamente pertinente.</p></CardContent></Card></aside></main>
    <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2 px-6 pb-8 text-xs text-[#91a3af]"><span>Dados públicos consultados sob demanda · Recomendações determinísticas e revisáveis</span><span>Fernando Feitosa — Revisor</span></footer>
  </div>;
}

function toDraft(result:Result):Editable { const { razaoSocial,nomeFantasia,situacao,capitalSocial,cnaePrincipal,atividadePrincipal,cidade,uf,endereco } = result; return { razaoSocial,nomeFantasia,situacao,capitalSocial,cnaePrincipal,atividadePrincipal,cidade,uf,endereco }; }
function downloadBase64(data:string, filename:string) { const raw=atob(data); const bytes=Uint8Array.from(raw,char=>char.charCodeAt(0)); const url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"})); const anchor=document.createElement("a"); anchor.href=url; anchor.download=filename; anchor.click(); URL.revokeObjectURL(url); toast.success("Relatório PDF baixado."); }
function FieldLabel({children}:{children:ReactNode}) { return <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#718596]">{children}</label>; }
function Metric({label,value,note,icon}:{label:string;value:string;note:string;icon:ReactNode}) { return <div className="rounded-2xl border border-[#d9e4ea] bg-white p-4"><div className="mb-3 flex items-center justify-between text-[#0f766e]">{icon}<span className="text-[10px] font-bold uppercase tracking-widest text-[#91a3af]">{label}</span></div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-[#718596]">{note}</p></div>; }
function HubRow({name,desc,color}:{name:string;desc:string;color:string}) { return <div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${color}`}/><div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-[#91a3af]">{desc}</p></div></div>; }
function HubManager({hubs,newHub,onChange,onAdd,onRemove}:{hubs:Hub[];newHub:Hub;onChange:(hub:Hub)=>void;onAdd:()=>void;onRemove:(name:string)=>void}) { const set=(key:keyof Hub,value:string|number)=>onChange({...newHub,[key]:value}); return <Card className="mt-6 rounded-2xl border-[#cfe2e4] bg-[#f7fbfb]"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><MapPin size={17} className="text-[#0f766e]"/>Comparar hubs adicionais</CardTitle><p className="text-xs font-normal leading-5 text-[#718596]">Marília e Ribeirão Preto permanecem fixos. Adicione até 10 hubs por coordenadas para incluí-los na recomendação.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><Edit label="Nome do hub" value={newHub.nome} onChange={value=>set("nome",value)}/><Edit label="Cidade" value={newHub.cidade} onChange={value=>set("cidade",value)}/><Edit label="UF" value={newHub.uf} onChange={value=>set("uf",value)}/><Edit label="DDD" value={newHub.ddd} onChange={value=>set("ddd",value.replace(/\D/g, "").slice(0,2))}/><Edit label="Latitude" type="number" value={newHub.lat || ""} onChange={value=>set("lat",Number(value))}/><Edit label="Longitude" type="number" value={newHub.lon || ""} onChange={value=>set("lon",Number(value))}/></div><Button type="button" onClick={onAdd} variant="outline" className="h-10 rounded-xl border-[#0f766e] bg-white text-[#0f766e] hover:bg-[#e8f5f2]"><MapPin size={16}/>Adicionar hub</Button>{hubs.length > 0 && <div className="rounded-xl border border-[#d9e4ea] bg-white"><div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#edf2f4] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#718596]"><span>Hubs adicionais em comparação</span><span>{hubs.length}/10</span></div>{hubs.map(hub=><div key={hub.nome} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span><b>{hub.nome}</b>{hub.cidade ? ` · ${hub.cidade}${hub.uf ? `/${hub.uf}` : ""}` : ""}{hub.ddd ? <small className="ml-2 text-[#718596]">DDD {hub.ddd} · {hub.lat}, {hub.lon}</small> : <small className="ml-2 text-[#718596]">{hub.lat}, {hub.lon}</small>}</span><Button type="button" variant="ghost" size="sm" onClick={()=>onRemove(hub.nome)} className="text-[#a54b4b] hover:bg-[#fff1f1] hover:text-[#8f3030]">Remover</Button></div>)}</div>}</CardContent></Card>; }
function ResultCard({result}:{result:Result}) {
  return <Card className="rounded-2xl border-[#d9e4ea] bg-white"><CardContent className="p-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-bold">{result.razaoSocial}</h4><Badge className={`rounded-full ${tone(result.vendedor)}`}>{result.vendedor}</Badge></div><p className="mt-1 text-xs text-[#718596]">{result.cnpj} · {result.cidade}{result.uf ? ` / ${result.uf}` : ""} · {result.situacao}</p></div><div className="text-left md:text-right"><p className="text-3xl font-bold text-[#0f766e]">{result.score}<span className="text-sm font-normal text-[#91a3af]">/13</span></p><p className="text-[10px] font-bold uppercase tracking-widest text-[#91a3af]">score final</p></div></div>
    <div className="mt-5 grid gap-3 border-y border-[#edf2f4] py-4 sm:grid-cols-3"><Info label="Capital social" value={money(result.capitalSocial)}/><Info label="Porte inferido" value={result.porte}/><Info label="Hub mais próximo" value={result.hubMaisProximo}/></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]"><div><p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#718596]">Memória de cálculo</p>{result.scoreDetalhes.map(item=><div key={item.criterio} className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-[#5f7281]">{item.criterio}</span><span className="font-bold text-[#102a43]">+{item.pontos}</span></div>)}</div><div className="rounded-xl bg-[#f5f8f9] p-4"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold text-[#102a43]">Comparação entre hubs</span><span className="text-[#718596]">linha reta</span></div><div className="space-y-2">{result.distanciasHubs.map(hub=><Distance key={hub.nome} label={hub.nome} value={hub.distanciaKm}/>)}</div></div></div>
    <p className="mt-4 border-l-2 border-[#0f9b8e] pl-3 text-sm leading-6 text-[#5f7281]">{result.explicacao}</p>
  </CardContent></Card>;
}
function Info({label,value}:{label:string;value:string}) { return <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#91a3af]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
function Distance({label,value}:{label:string;value:number|null}) { return <div className="grid grid-cols-[82px_1fr_50px] items-center gap-2 text-xs"><span className="text-[#718596]">{label}</span><Progress value={value == null ? 0 : Math.max(8,100-Math.min(value,900)/9)} className="h-1.5 bg-[#dce8eb]"/><span className="text-right font-semibold text-[#102a43]">{value == null ? "n/d" : `${value} km`}</span></div>; }
function ReviewForm({draft,onChange,onAnalyze,busy}:{draft:Editable;onChange:(value:Editable)=>void;onAnalyze:()=>void;busy:boolean}) { const set=(key:keyof Editable,value:string|number|null)=>onChange({...draft,[key]:value}); return <div className="mt-6 rounded-2xl border border-[#cfe2e4] bg-[#f5fbfa] p-4"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#0f766e]">Revisão cadastral</p><p className="mt-1 text-sm text-[#5f7281]">Confirme ou corrija os dados antes de gerar a recomendação.</p></div><Badge className="rounded-full bg-[#e1f3ef] text-[#0f766e]">Editável</Badge></div><div className="grid gap-3 sm:grid-cols-2"><Edit label="Razão social" value={draft.razaoSocial} onChange={value=>set("razaoSocial",value)} wide/><Edit label="Nome fantasia" value={draft.nomeFantasia} onChange={value=>set("nomeFantasia",value)}/><Edit label="Situação cadastral" value={draft.situacao} onChange={value=>set("situacao",value)}/><Edit label="Cidade" value={draft.cidade} onChange={value=>set("cidade",value)}/><Edit label="UF" value={draft.uf} onChange={value=>set("uf",value)}/><Edit label="CNAE principal" value={draft.cnaePrincipal} onChange={value=>set("cnaePrincipal",value)}/><Edit label="Capital social (R$)" value={draft.capitalSocial ?? ""} type="number" onChange={value=>set("capitalSocial",value === "" ? null : Number(value))}/><Edit label="Atividade principal" value={draft.atividadePrincipal} onChange={value=>set("atividadePrincipal",value)} wide/><Edit label="Endereço" value={draft.endereco} onChange={value=>set("endereco",value)} wide/></div><Button onClick={onAnalyze} disabled={busy} className="mt-5 h-11 w-full rounded-xl bg-[#0f766e] text-white hover:bg-[#0b6059]">{busy ? "Analisando informações confirmadas…" : "Confirmar dados e analisar"}<CheckCircle2 size={17}/></Button></div>; }
function Edit({label,value,onChange,wide,type="text"}:{label:string;value:string|number;onChange:(value:string)=>void;wide?:boolean;type?:string}) { return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#718596]">{label}</span><Input type={type} value={value} onChange={event=>onChange(event.target.value)} className="h-10 rounded-lg border-[#cfe2e4] bg-white text-sm"/></label>; }
