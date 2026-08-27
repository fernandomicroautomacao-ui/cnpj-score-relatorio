import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Building2, CheckCircle2, Clock3, FileDown, FileSpreadsheet, FileUp, Gauge, Settings, Upload, Waypoints } from "lucide-react";
import { Link } from "wouter";
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

type Result = { cnpj:string; razaoSocial:string; nomeFantasia:string; situacao:string; capitalSocial:number|null; porte:string; cnaePrincipal:string; atividadePrincipal:string; cidade:string; uf:string; endereco:string; ddd:string; score:number; scoreDetalhes:{criterio:string;resultado:string;pontos:number}[]; vendedor:string; hubMaisProximo:string; distanciaMariliaKm:number|null; distanciaRibeiraoKm:number|null; distanciasHubs:{nome:string;distanciaKm:number}[]; explicacao:string };
type Editable = Pick<Result, "razaoSocial" | "nomeFantasia" | "situacao" | "capitalSocial" | "cnaePrincipal" | "atividadePrincipal" | "cidade" | "uf" | "endereco">;
type BatchJob = { id:string; status:"queued"|"running"|"completed"; total:number; processed:number; results:Result[]; errors:{cnpj:string;message:string}[]; createdAt:string; startedAt?:string; completedAt?:string; nextConsultationAt?:string };
const MAX_BATCH = 500;
const money = (value:number|null) => value == null ? "Não informado" : value.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const tone = (vendor:string) => vendor.includes("Marília") ? "bg-[#e8f5f2] text-[#0f766e]" : vendor.includes("Ribeirão") ? "bg-[#eaf2f9] text-[#2b6495]" : "bg-[#fff5df] text-[#9a6814]";

export default function Home() {
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");
  const [tab, setTab] = useState("individual");
  const [results, setResults] = useState<Result[]>([]);
  const [draft, setDraft] = useState<Editable | null>(null);
  const [netlifyBusy, setNetlifyBusy] = useState(false);
  const [netlifyReportBusy, setNetlifyReportBusy] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(() => typeof window === "undefined" ? null : window.localStorage.getItem("cnpj-score-active-batch"));
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const useNetlify = import.meta.env.VITE_DEPLOY_TARGET === "netlify";
  const rawBulk = useMemo(() => bulk.split(/[\n,;]+/).map(onlyDigits).filter(Boolean), [bulk]);
  const current = useMemo(() => tab === "individual" ? (single ? [single] : []) : parseCnpjList(bulk), [single, bulk, tab]);
  const analyze = trpc.cnpj.analyze.useMutation({ onSuccess:data => { setResults(data.results as Result[]); data.errors.length ? toast.error(`${data.errors.length} CNPJ(s) não puderam ser consultados.`) : toast.success(`${data.results.length} consulta(s) concluída(s).`); }, onError:error => toast.error(error.message) });
  const lookup = trpc.cnpj.lookup.useMutation({ onSuccess:data => { setDraft(toDraft(data as Result)); toast.success("Dados carregados. Revise ou corrija antes de analisar."); }, onError:error => toast.error(error.message) });
  const report = trpc.cnpj.report.useMutation({ onSuccess:data => downloadBase64(data.data, data.filename), onError:error => toast.error(error.message) });

  useEffect(() => {
    if (!useNetlify || !activeBatchId) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/batch?id=${encodeURIComponent(activeBatchId)}`);
        const data = await response.json() as BatchJob & { error?: string };
        if (!response.ok) throw new Error(data.error || "Não foi possível consultar o lote.");
        if (cancelled) return;
        setBatchJob(data);
        if (data.status === "completed") {
          setResults(data.results);
          window.localStorage.removeItem("cnpj-score-active-batch");
          setActiveBatchId(null);
          data.errors.length ? toast.warning(`Lote concluído: ${data.results.length} análises e ${data.errors.length} falha(s).`) : toast.success(`Lote concluído com ${data.results.length} análises.`);
        }
      } catch (error) { if (!cancelled) toast.error(error instanceof Error ? error.message : "Falha ao acompanhar o lote."); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeBatchId, useNetlify]);

  async function lookupCnpj() {
    if (onlyDigits(single).length !== 14) return toast.error("Informe um CNPJ com 14 dígitos.");
    if (!useNetlify) return lookup.mutate({ cnpj:single });
    setNetlifyBusy(true);
    try { const response = await fetch("/api/lookup", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ cnpj:single }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Falha ao buscar CNPJ."); setDraft(toDraft(data as Result)); toast.success("Dados carregados. Revise ou corrija antes de analisar."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao buscar CNPJ."); }
    finally { setNetlifyBusy(false); }
  }
  async function startBackgroundBatch() {
    if (!useNetlify) return toast.info("O processamento em segundo plano fica disponível no site publicado.");
    if (activeBatchId) return toast.info("Já existe um lote em andamento. Acompanhe o progresso abaixo.");
    setNetlifyBusy(true);
    try {
      const response = await fetch("/api/batch", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ cnpjs:current }) });
      const data = await response.json() as { id?:string; total?:number; status?:BatchJob["status"]; error?:string };
      if (!response.ok || !data.id) throw new Error(data.error || "Não foi possível iniciar o lote.");
      window.localStorage.setItem("cnpj-score-active-batch", data.id);
      setActiveBatchId(data.id);
      setBatchJob({ id:data.id, status:data.status ?? "queued", total:data.total ?? current.length, processed:0, results:[], errors:[], createdAt:new Date().toISOString() });
      setResults([]);
      toast.success(`Lote de ${data.total} CNPJs iniciado. Você pode fechar esta aba e voltar mais tarde.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao iniciar o lote."); }
    finally { setNetlifyBusy(false); }
  }
  async function submit() {
    if (!current.length) return toast.error("Informe ao menos um CNPJ.");
    if (tab === "lote" && rawBulk.length > MAX_BATCH) return toast.error("O limite é de 500 CNPJs por lote.");
    if (tab === "individual" && !canAnalyzeIndividual(single, Boolean(draft))) return toast.error(onlyDigits(single).length !== 14 ? "Informe um CNPJ com 14 dígitos." : "Busque e confirme os dados cadastrais antes de analisar.");
    if (tab === "lote") return startBackgroundBatch();
    const payload = { cnpjs:current, overrides:draft ?? undefined };
    if (!useNetlify) return analyze.mutate(payload);
    setNetlifyBusy(true);
    try { const response = await fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Falha ao analisar CNPJ."); setResults(data.results); toast.success("Consulta concluída."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao analisar CNPJ."); }
    finally { setNetlifyBusy(false); }
  }
  async function exportPdf() {
    if (!results.length) return toast.error("Consulte pelo menos um CNPJ antes de exportar.");
    const payload = { cnpjs:results.map(result => result.cnpj), overrides:tab === "individual" ? draft ?? undefined : undefined };
    if (!useNetlify) return report.mutate(payload);
    setNetlifyReportBusy(true);
    try { const response = await fetch("/api/report", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) }); if (!response.ok) { const data=await response.json(); throw new Error(data.error || "Falha ao gerar PDF."); } downloadBlob(await response.blob(), "relatorio-cnpj.pdf"); toast.success("Relatório PDF baixado."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao gerar PDF."); }
    finally { setNetlifyReportBusy(false); }
  }
  function importFile(file?: File) { if (!file) return; const reader=new FileReader(); reader.onload=()=>{ const content=String(reader.result ?? ""); setBulk(content); const count=content.split(/[\n,;]+/).map(onlyDigits).filter(Boolean).length; count > MAX_BATCH ? toast.error("Arquivo carregado, mas contém mais de 500 CNPJs.") : toast.success(`${file.name} carregado: ${count} CNPJ(s).`); }; reader.readAsText(file,"UTF-8"); }
  const busy = netlifyBusy || analyze.isPending;
  const batchProgress = batchJob ? Math.round((batchJob.processed / Math.max(batchJob.total, 1)) * 100) : 0;

  return <div className="min-h-screen bg-[#f5f7f8] text-[#102a43]">
    <header className="sticky top-0 z-10 border-b border-[#d9e4ea] bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-4"><div className="flex items-center gap-3"><div className="brand-mark"><Waypoints size={19}/></div><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#5f7d8d]">Inteligência comercial</p><h1 className="text-lg font-bold tracking-tight">Análise Carteira <span className="font-light text-[#5f7d8d]">Micro Automação Campinas</span></h1></div></div><div className="flex items-center gap-3"><Badge variant="outline" className="hidden rounded-full border-[#cfe2e4] bg-[#f2fbfa] px-3 py-1 text-[#0f766e] sm:flex">Motor determinístico ativo</Badge><Link href="/configuracoes" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cbdde2] bg-white px-4 text-sm font-medium text-[#102a43] hover:bg-[#f5fbfa]"><Settings size={16}/>Configurações</Link></div></div></header>
    <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-7 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_390px]"><section><div className="mb-8 max-w-3xl"><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#0f766e]"><span className="h-px w-8 bg-[#0f766e]"/>análise comercial</p><h2 className="text-4xl font-bold leading-[1.06] tracking-[-.04em] sm:text-5xl">Carteira priorizada<br/><span className="text-[#0f766e]">por dados e critérios.</span></h2><p className="mt-5 max-w-xl text-base leading-7 text-[#5f7281]">Consulte dados públicos de CNPJ, revise o cadastro e gere um relatório comercial auditável.</p></div>
      <Card className="overflow-hidden rounded-2xl border-[#d9e4ea] bg-white shadow-[0_20px_60px_rgba(16,42,67,.07)]"><CardHeader className="border-b border-[#edf2f4] px-6 pb-0 pt-6"><div className="flex items-start justify-between"><div><CardTitle className="text-xl">Nova análise</CardTitle><p className="mt-1 text-sm text-[#718596]">Dados públicos → revisão → recomendação</p></div><div className="rounded-xl bg-[#e8f5f2] p-3 text-[#0f766e]"><Gauge size={22}/></div></div><Tabs value={tab} onValueChange={setTab} className="mt-6"><TabsList className="h-11 w-full justify-start gap-6 rounded-none bg-transparent p-0"><TabsTrigger value="individual" className="rounded-none border-b-2 border-transparent bg-transparent px-0 data-[state=active]:border-[#0f766e] data-[state=active]:text-[#0f766e]">Consulta individual</TabsTrigger><TabsTrigger value="lote" className="rounded-none border-b-2 border-transparent bg-transparent px-0 data-[state=active]:border-[#0f766e] data-[state=active]:text-[#0f766e]">Importar em lote</TabsTrigger></TabsList></Tabs></CardHeader><CardContent className="p-6"><Tabs value={tab} onValueChange={setTab}><TabsContent value="individual" className="mt-0"><FieldLabel>CNPJ da empresa</FieldLabel><div className="flex gap-3"><Input value={single} onChange={event=>{setSingle(maskCnpj(event.target.value));setDraft(null);}} onKeyDown={event=>event.key === "Enter" && lookupCnpj()} placeholder="00.000.000/0001-00" className="h-12 rounded-xl border-[#d9e4ea] bg-[#fbfcfc] text-base"/><Button onClick={lookupCnpj} disabled={lookup.isPending || busy} className="h-12 rounded-xl bg-[#102a43] px-6 text-white hover:bg-[#1b425f]">{lookup.isPending || busy ? "Buscando…" : "Buscar dados"}<ArrowUpRight size={17}/></Button></div><p className="mt-3 text-xs text-[#91a3af]">A consulta utiliza somente a API Pública do CNPJá e não requer chave.</p>{draft && <ReviewForm draft={draft} onChange={setDraft} onAnalyze={submit} busy={busy}/>}</TabsContent><TabsContent value="lote" className="mt-0"><FieldLabel>Lista de CNPJs</FieldLabel><textarea value={bulk} onChange={event=>setBulk(event.target.value)} placeholder="Um CNPJ por linha, ou separados por vírgula" className="min-h-32 w-full rounded-xl border border-[#d9e4ea] bg-[#fbfcfc] p-3 text-sm outline-none ring-[#0f766e] focus:ring-2"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-[#718596]"><Clock3 size={14}/>Até 500 CNPJs · 15 segundos entre consultas</span><div className="flex gap-2"><input ref={upload} type="file" accept=".csv,.txt" className="hidden" onChange={event=>importFile(event.target.files?.[0])}/><Button variant="outline" onClick={()=>upload.current?.click()} className="h-11 rounded-xl border-[#cbdde2] bg-white"><FileUp size={16}/>Importar arquivo</Button><Button onClick={submit} disabled={busy || Boolean(activeBatchId)} className="h-11 rounded-xl bg-[#102a43] px-6 text-white hover:bg-[#1b425f]">{busy ? "Iniciando…" : activeBatchId ? "Lote em andamento" : "Processar lote"}<ArrowUpRight size={17}/></Button></div></div><p className="mt-3 text-xs leading-5 text-[#718596]">O lote continua em segundo plano. Um lote de 500 CNPJs leva aproximadamente 2h05 no intervalo configurado.</p></TabsContent></Tabs></CardContent></Card>
      {batchJob && <BatchProgress job={batchJob} percentage={batchProgress}/>} {results.length > 0 && <ResultArea results={results} batch={tab === "lote"} onPdf={exportPdf} onCsv={()=>downloadSummaryCsv(results)} pdfBusy={report.isPending || netlifyReportBusy}/>}</section>
      <aside className="space-y-5"><Card className="rounded-2xl border-0 bg-[#102a43] text-white shadow-[0_18px_45px_rgba(16,42,67,.18)]"><CardContent className="p-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#8fcfc4]">Como funciona</p><h3 className="mt-4 text-2xl font-bold leading-tight">Cada recomendação<br/>vem com a sua prova.</h3><div className="mt-7 space-y-5">{["Consulta pública no CNPJá","Revisão cadastral editável","Pontuação por regra fixa","Distância entre os hubs"].map((item,index)=><div key={item} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-[#8fcfc4]">0{index+1}</span><p className="pt-1 text-sm text-[#d6e4ea]">{item}</p></div>)}</div></CardContent></Card><Card className="rounded-2xl border-[#d9e4ea] bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 size={17} className="text-[#0f766e]"/>Hubs de atendimento</CardTitle></CardHeader><CardContent className="space-y-4 pt-0"><HubRow name="Marília / SP" desc="Hub oeste" color="bg-[#0f9b8e]"/><HubRow name="Ribeirão Preto / SP" desc="Hub norte" color="bg-[#4685b8]"/><Separator/><p className="text-xs leading-5 text-[#718596]">Hubs, pesos e limites são mantidos na página de Configurações.</p></CardContent></Card></aside>
    </main><footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2 px-6 pb-8 text-xs text-[#91a3af]"><span>Dados públicos consultados sob demanda · Recomendações determinísticas e revisáveis</span><span>Fernando Feitosa — Revisor</span></footer></div>;
}

function BatchProgress({job,percentage}:{job:BatchJob;percentage:number}) { return <Card className="mt-6 rounded-2xl border-[#a9d7d1] bg-[#eef9f7]"><CardContent className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 font-bold text-[#164b46]"><Clock3 size={17}/>Lote em segundo plano</p><p className="mt-1 text-sm text-[#37605c]">{job.status === "queued" ? "Na fila para iniciar" : job.status === "completed" ? "Concluído" : "Consultando a API Pública a cada 15 segundos"}</p></div><Badge className="bg-white text-[#0f766e]">{job.processed} de {job.total}</Badge></div><Progress value={percentage} className="mt-4 h-2 bg-[#cde6e1]"/><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#4f7772]"><span>{percentage}% processado · {job.results.length} sucesso(s) · {job.errors.length} falha(s)</span><span>{job.nextConsultationAt ? `Próxima consulta: ${new Date(job.nextConsultationAt).toLocaleTimeString("pt-BR")}` : job.completedAt ? `Concluído às ${new Date(job.completedAt).toLocaleTimeString("pt-BR")}` : "Preparando execução"}</span></div></CardContent></Card>; }
function ResultArea({results,batch,onPdf,onCsv,pdfBusy}:{results:Result[];batch:boolean;onPdf:()=>void;onCsv:()=>void;pdfBusy:boolean}) { return <div className="mt-10"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#718596]">Relatório resumido</p><h3 className="mt-1 text-2xl font-bold">{results.length} empresa{results.length > 1 ? "s" : ""} analisada{results.length > 1 ? "s" : ""}</h3></div><div className="flex flex-wrap gap-2"><Button onClick={onCsv} variant="outline" className="rounded-xl border-[#0f766e] bg-white text-[#0f766e]"><FileSpreadsheet size={16}/>Baixar tabela CSV (Excel)</Button>{!batch && <Button onClick={onPdf} variant="outline" disabled={pdfBusy} className="rounded-xl border-[#cbdde2] bg-white"><FileDown size={16}/>{pdfBusy ? "Gerando PDF…" : "Baixar PDF detalhado"}</Button>}</div></div><SummaryTable results={results}/>{!batch && <div className="mt-5 space-y-4">{results.map(result=><ResultCard key={result.cnpj} result={result}/>)}</div>}</div>; }
function SummaryTable({results}:{results:Result[]}) { return <div className="overflow-x-auto rounded-2xl border border-[#d9e4ea] bg-white"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-[#f2f7f7] text-[10px] uppercase tracking-widest text-[#5f7281]"><tr>{["CNPJ","Empresa","Cidade / UF","Situação","Score","Canal recomendado","Hub","Distância"].map(item=><th key={item} className="px-4 py-3 font-bold">{item}</th>)}</tr></thead><tbody>{results.map(result=><tr key={result.cnpj} className="border-t border-[#edf2f4]"><td className="px-4 py-3 font-mono text-xs">{result.cnpj}</td><td className="max-w-64 px-4 py-3 font-semibold">{result.razaoSocial}</td><td className="px-4 py-3">{result.cidade || "n/d"}{result.uf ? ` / ${result.uf}` : ""}</td><td className="px-4 py-3">{result.situacao}</td><td className="px-4 py-3 font-bold text-[#0f766e]">{result.score}</td><td className="px-4 py-3"><Badge className={`whitespace-nowrap ${tone(result.vendedor)}`}>{result.vendedor.replace("Vendedor ", "")}</Badge></td><td className="px-4 py-3">{result.hubMaisProximo}</td><td className="px-4 py-3">{result.distanciasHubs[0]?.distanciaKm == null ? "n/d" : `${result.distanciasHubs[0].distanciaKm} km`}</td></tr>)}</tbody></table></div>; }
function toDraft(result:Result):Editable { const {razaoSocial,nomeFantasia,situacao,capitalSocial,cnaePrincipal,atividadePrincipal,cidade,uf,endereco}=result; return {razaoSocial,nomeFantasia,situacao,capitalSocial,cnaePrincipal,atividadePrincipal,cidade,uf,endereco}; }
function downloadBase64(data:string,filename:string) { const raw=atob(data); downloadBlob(new Blob([Uint8Array.from(raw,char=>char.charCodeAt(0))],{type:"application/pdf"}),filename); toast.success("Relatório PDF baixado."); }
function downloadBlob(blob:Blob,filename:string) { const url=URL.createObjectURL(blob); const anchor=document.createElement("a"); anchor.href=url; anchor.download=filename; anchor.click(); URL.revokeObjectURL(url); }
function csvCell(value:unknown) { const text=String(value ?? ""); return /[",;\n]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text; }
function downloadSummaryCsv(results:Result[]) { const columns=["CNPJ","Razão social","Nome fantasia","Cidade","UF","Situação","Capital social","Porte","CNAE","Score","Canal recomendado","Hub selecionado","Distância mais próxima (km)"]; const lines=results.map(result=>[result.cnpj,result.razaoSocial,result.nomeFantasia,result.cidade,result.uf,result.situacao,result.capitalSocial ?? "",result.porte,result.cnaePrincipal,result.score,result.vendedor,result.hubMaisProximo,result.distanciasHubs[0]?.distanciaKm ?? ""].map(csvCell).join(";")); downloadBlob(new Blob([`\ufeff${columns.join(";")}\n${lines.join("\n")}`],{type:"text/csv;charset=utf-8"}),`resumo-cnpj-${new Date().toISOString().slice(0,10)}.csv`); toast.success("Tabela CSV compatível com Excel baixada."); }
function FieldLabel({children}:{children:ReactNode}) { return <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#718596]">{children}</label>; }
function HubRow({name,desc,color}:{name:string;desc:string;color:string}) { return <div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${color}`}/><div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-[#91a3af]">{desc}</p></div></div>; }
function ResultCard({result}:{result:Result}) { return <Card className="rounded-2xl border-[#d9e4ea] bg-white"><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-bold">{result.razaoSocial}</h4><Badge className={`rounded-full ${tone(result.vendedor)}`}>{result.vendedor}</Badge></div><p className="mt-1 text-xs text-[#718596]">{result.cnpj} · {result.cidade}{result.uf ? ` / ${result.uf}` : ""} · {result.situacao}</p></div><div className="text-left md:text-right"><p className="text-3xl font-bold text-[#0f766e]">{result.score}<span className="text-sm font-normal text-[#91a3af]"> pontos</span></p><p className="text-[10px] font-bold uppercase tracking-widest text-[#91a3af]">score final</p></div></div><div className="mt-5 grid gap-3 border-y border-[#edf2f4] py-4 sm:grid-cols-3"><Info label="Capital social" value={money(result.capitalSocial)}/><Info label="Porte inferido" value={result.porte}/><Info label="Hub recomendado" value={result.hubMaisProximo}/></div><p className="mt-4 border-l-2 border-[#0f9b8e] pl-3 text-sm leading-6 text-[#5f7281]">{result.explicacao}</p></CardContent></Card>; }
function Info({label,value}:{label:string;value:string}) { return <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#91a3af]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
function ReviewForm({draft,onChange,onAnalyze,busy}:{draft:Editable;onChange:(value:Editable)=>void;onAnalyze:()=>void;busy:boolean}) { const set=(key:keyof Editable,value:string|number|null)=>onChange({...draft,[key]:value}); return <div className="mt-6 rounded-2xl border border-[#cfe2e4] bg-[#f5fbfa] p-4"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#0f766e]">Revisão cadastral</p><p className="mt-1 text-sm text-[#5f7281]">Confirme ou corrija os dados antes de gerar a recomendação.</p></div><Badge className="rounded-full bg-[#e1f3ef] text-[#0f766e]">Editável</Badge></div><div className="grid gap-3 sm:grid-cols-2"><Edit label="Razão social" value={draft.razaoSocial} onChange={value=>set("razaoSocial",value)} wide/><Edit label="Nome fantasia" value={draft.nomeFantasia} onChange={value=>set("nomeFantasia",value)}/><Edit label="Situação cadastral" value={draft.situacao} onChange={value=>set("situacao",value)}/><Edit label="Cidade" value={draft.cidade} onChange={value=>set("cidade",value)}/><Edit label="UF" value={draft.uf} onChange={value=>set("uf",value)}/><Edit label="CNAE principal" value={draft.cnaePrincipal} onChange={value=>set("cnaePrincipal",value)}/><Edit label="Capital social (R$)" value={draft.capitalSocial ?? ""} type="number" onChange={value=>set("capitalSocial",value === "" ? null : Number(value))}/><Edit label="Atividade principal" value={draft.atividadePrincipal} onChange={value=>set("atividadePrincipal",value)} wide/><Edit label="Endereço" value={draft.endereco} onChange={value=>set("endereco",value)} wide/></div><Button onClick={onAnalyze} disabled={busy} className="mt-5 h-11 w-full rounded-xl bg-[#0f766e] text-white hover:bg-[#0b6059]">{busy ? "Analisando informações confirmadas…" : "Confirmar dados e analisar"}<CheckCircle2 size={17}/></Button></div>; }
function Edit({label,value,onChange,wide,type="text"}:{label:string;value:string|number;onChange:(value:string)=>void;wide?:boolean;type?:string}) { return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#718596]">{label}</span><Input type={type} value={value} onChange={event=>onChange(event.target.value)} className="h-10 rounded-lg border-[#cfe2e4] bg-white text-sm"/></label>; }
