import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Gauge, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Hub = { id?:number; isDefault?:number; nome:string; cidade:string; uf:string; ddd:string; lat:number; lon:number; minimumScore:number };
type Rules = { situacaoAtiva:number; situacaoInativa:number; capitalGrande:number; capitalMedia:number; capitalPequena:number; capitalGrandeMin:number; capitalMediaMin:number; capitalSemInformacao:number; cnaeA:number; cnaeB:number; cnaeSemClassificacao:number; geoProximo:number; geoSecundario:number; geoDistante:number; geoProximoKm:number; geoSecundarioKm:number; dddMesmo:number; dddEstado:number; dddOutro:number; minimoExterno:number };
type RuleItem = [keyof Rules,string,string];

const DEFAULT_RULES:Rules = { situacaoAtiva:1,situacaoInativa:0,capitalGrande:3,capitalMedia:2,capitalPequena:1,capitalGrandeMin:10_000_000,capitalMediaMin:1_000_000,capitalSemInformacao:1,cnaeA:3,cnaeB:2,cnaeSemClassificacao:1,geoProximo:3,geoSecundario:2,geoDistante:1,geoProximoKm:180,geoSecundarioKm:320,dddMesmo:3,dddEstado:2,dddOutro:1,minimoExterno:8 };
const SCORE_KEYS = new Set<keyof Rules>(["situacaoAtiva","situacaoInativa","capitalGrande","capitalMedia","capitalPequena","capitalSemInformacao","cnaeA","cnaeB","cnaeSemClassificacao","geoProximo","geoSecundario","geoDistante","dddMesmo","dddEstado","dddOutro"]);
const SCORE_RULES:RuleItem[] = [["situacaoAtiva","Situação ativa","Cadastro regular"],["situacaoInativa","Situação não regular","Pode reduzir o score"],["capitalGrande","Capital grande","Peso de porte elevado"],["capitalMedia","Capital médio","Peso de porte médio"],["capitalPequena","Capital pequeno","Peso de porte pequeno"],["capitalSemInformacao","Capital ausente","Peso conservador"],["cnaeA","CNAE categoria A","Aderência alta"],["cnaeB","CNAE categoria B","Aderência média"],["cnaeSemClassificacao","CNAE ausente","Peso conservador"],["geoProximo","Geografia próxima","Primeira faixa"],["geoSecundario","Geografia secundária","Segunda faixa"],["geoDistante","Geografia distante","Fora das faixas"],["dddMesmo","DDD igual","Mesmo DDD do hub"],["dddEstado","DDD SP","Outro DDD de SP"],["dddOutro","DDD externo","DDD fora de SP"]];
const LIMIT_RULES:RuleItem[] = [["capitalGrandeMin","Capital grande a partir de","Valor em R$"],["capitalMediaMin","Capital médio a partir de","Valor em R$"],["geoProximoKm","Raio próximo","Quilômetros"],["geoSecundarioKm","Raio secundário","Quilômetros"],["minimoExterno","Mínimo padrão externo","Fallback sem mínimo próprio"]];
const freshHub = ():Hub => ({ nome:"",cidade:"",uf:"SP",ddd:"",lat:0,lon:0,minimumScore:8 });

export default function Configuracoes() {
  const useNetlify = import.meta.env.VITE_DEPLOY_TARGET === "netlify";
  const [token,setToken] = useState("");
  const [hubs,setHubs] = useState<Hub[]>([]);
  const [rules,setRules] = useState<Rules>(DEFAULT_RULES);
  const [newHub,setNewHub] = useState<Hub>(freshHub());
  const [deletedIds,setDeletedIds] = useState<number[]>([]);
  const [saving,setSaving] = useState(false);
  const config = trpc.controlPanel.list.useQuery(undefined,{enabled:!useNetlify});
  const utils = trpc.useUtils();
  const createHub = trpc.controlPanel.createHub.useMutation();
  const updateHub = trpc.controlPanel.updateHub.useMutation();
  const deleteHub = trpc.controlPanel.deleteHub.useMutation();
  const updateParameter = trpc.controlPanel.updateParameter.useMutation();
  const restoreDefaults = trpc.controlPanel.restoreDefaults.useMutation();

  function applyConfig(data:any) {
    setHubs(data.hubs.map((hub:any)=>({ id:hub.id,isDefault:hub.isDefault,nome:hub.name,cidade:hub.city,uf:hub.state,ddd:hub.ddd ?? "",lat:hub.latitude,lon:hub.longitude,minimumScore:hub.minimumScore ?? 8 })));
    setRules(current=>({ ...current,...Object.fromEntries(data.parameters.map((parameter:any)=>[parameter.key,parameter.value])) }));
    setDeletedIds([]);
  }
  async function netlifyControl(action?:string,payload:Record<string,unknown>={}) {
    const response = await fetch("/api/control", action ? { method:"POST",headers:{"Content-Type":"application/json",...(token ? {"x-control-panel-token":token}:{})},body:JSON.stringify({action,...payload})}:undefined);
    const data=await response.json();
    if(!response.ok) throw new Error(data.error || "Falha ao atualizar as configurações.");
    return data;
  }
  useEffect(()=>{ if(useNetlify){ void netlifyControl().then(applyConfig).catch(error=>toast.error(error instanceof Error ? error.message:"Falha ao carregar configurações.")); return; } if(config.data) applyConfig(config.data); },[useNetlify,config.data]);

  const updateRule = (key:keyof Rules,value:string) => {
    const parsed = Number(value);
    const minimum = SCORE_KEYS.has(key) ? -100 : key === "capitalGrandeMin" || key === "capitalMediaMin" ? 0 : 1;
    setRules(current=>({ ...current,[key]:Number.isFinite(parsed) ? Math.max(minimum,parsed) : minimum }));
  };
  const updateLocalHub = (hub:Hub,key:keyof Hub,value:string|number) => { const safeValue = key === "minimumScore" ? Math.max(1, Number(value) || 1) : value; setHubs(current=>current.map(item=>item===hub?{...item,[key]:safeValue}:item)); };
  function addLocalHub() {
    if(!newHub.nome.trim() || !newHub.cidade.trim() || !newHub.ddd || !newHub.lat || !newHub.lon) return toast.error("Preencha nome, cidade, DDD, latitude e longitude.");
    if(!Number.isInteger(newHub.minimumScore) || newHub.minimumScore < 1) return toast.error("A pontuação mínima do hub deve ser pelo menos 1.");
    if(hubs.some(hub=>hub.nome.toLowerCase()===newHub.nome.trim().toLowerCase())) return toast.error("Já existe um hub com esse nome.");
    if(hubs.length>=12) return toast.error("O limite é de dez hubs adicionais além dos dois padrões.");
    setHubs(current=>[...current,{...newHub,nome:newHub.nome.trim(),cidade:newHub.cidade.trim(),uf:newHub.uf.trim().toUpperCase()}]);
    setNewHub(freshHub());
  }
  function removeLocalHub(hub:Hub) {
    if(hub.isDefault) return toast.error("Os hubs padrão podem ser editados, mas não removidos.");
    if(hub.id) setDeletedIds(current=>[...current,hub.id!]);
    setHubs(current=>current.filter(item=>item!==hub));
  }
  const storedHub = (hub:Hub) => ({name:hub.nome,city:hub.cidade,state:hub.uf.toUpperCase(),ddd:hub.ddd||null,latitude:Number(hub.lat),longitude:Number(hub.lon),minimumScore:Number(hub.minimumScore)});
  async function saveAll() {
    if(!token && useNetlify) return toast.error("Informe a chave de acesso no topo para salvar.");
    if(hubs.some(hub=>!Number.isInteger(Number(hub.minimumScore)) || Number(hub.minimumScore) < 1)) return toast.error("A pontuação mínima de cada hub deve ser pelo menos 1.");
    setSaving(true);
    try {
      if(useNetlify){
        for(const id of deletedIds) await netlifyControl("deleteHub",{id});
        for(const hub of hubs) hub.id ? await netlifyControl("updateHub",{id:hub.id,data:storedHub(hub)}) : await netlifyControl("createHub",{data:storedHub(hub)});
        for(const [key,value] of Object.entries(rules)) await netlifyControl("updateParameter",{key,value});
        applyConfig(await netlifyControl());
      } else {
        for(const id of deletedIds) await deleteHub.mutateAsync({id});
        for(const hub of hubs) hub.id ? await updateHub.mutateAsync({id:hub.id,data:storedHub(hub)}) : await createHub.mutateAsync(storedHub(hub));
        for(const [key,value] of Object.entries(rules)) await updateParameter.mutateAsync({key,value});
        await utils.controlPanel.list.invalidate();
      }
      toast.success("Configurações salvas com sucesso.");
    } catch(error) { toast.error(error instanceof Error?error.message:"Não foi possível salvar as configurações."); }
    finally { setSaving(false); }
  }
  async function restoreAll() {
    try { if(useNetlify) applyConfig(await netlifyControl("restoreDefaults")); else { await restoreDefaults.mutateAsync(); await utils.controlPanel.list.invalidate(); } toast.success("Pesos padrão restaurados."); }
    catch(error) { toast.error(error instanceof Error?error.message:"Não foi possível restaurar os padrões."); }
  }

  return <div className="min-h-screen bg-[#f5f7f8] text-[#102a43]"><header className="sticky top-0 z-20 border-b border-[#d9e4ea] bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-4"><div className="flex items-center gap-3"><div className="brand-mark"><Settings2 size={19}/></div><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#5f7d8d]">Administração comercial</p><h1 className="text-lg font-bold">Configurações de roteamento</h1></div></div><div className="flex flex-wrap items-end gap-3"><label className="w-72 max-w-full"><span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#80641a]">Chave de acesso para alterações</span><Input type="password" value={token} onChange={event=>setToken(event.target.value)} placeholder="Informe para liberar o salvamento" className="h-10 border-[#e4d5ac] bg-[#fffaf0]"/></label><Button onClick={saveAll} disabled={saving} className="h-10 rounded-xl bg-[#0f766e] text-white hover:bg-[#0b6059]"><Save size={16}/>{saving?"Salvando…":"Salvar configurações"}</Button><Link href="/" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cbdde2] bg-white px-4 text-sm font-medium hover:bg-[#f5fbfa]"><ArrowLeft size={16}/>Voltar à consulta</Link></div></div></header><main className="mx-auto max-w-[1440px] px-6 py-8"><div className="mb-8 max-w-3xl"><Badge className="bg-[#e8f5f2] text-[#0f766e]">Painel persistente</Badge><h2 className="mt-3 text-4xl font-bold tracking-[-.04em]">Hubs, pesos e limites<br/><span className="text-[#0f766e]">em um único lugar.</span></h2><p className="mt-4 max-w-2xl leading-7 text-[#5f7281]">Pesos podem ser positivos ou negativos: use valores negativos para penalizar perfis comerciais. As alterações entram em vigor depois de usar <b>Salvar configurações</b>.</p></div><div className="grid gap-6"><Card className="rounded-2xl border-[#d9e4ea] bg-white"><CardHeader className="border-b border-[#edf2f4]"><CardTitle className="flex items-center gap-2"><Building2 size={18} className="text-[#0f766e]"/>Hubs de atendimento</CardTitle><p className="text-sm font-normal text-[#718596]">Marília e Ribeirão Preto são predefinidos e podem ser editados, mas não removidos.</p></CardHeader><CardContent className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><HubField label="Nome" value={newHub.nome} onChange={value=>setNewHub({...newHub,nome:value})}/><HubField label="Cidade" value={newHub.cidade} onChange={value=>setNewHub({...newHub,cidade:value})}/><HubField label="UF" value={newHub.uf} onChange={value=>setNewHub({...newHub,uf:value})}/><HubField label="DDD" value={newHub.ddd} onChange={value=>setNewHub({...newHub,ddd:value.replace(/\D/g,"").slice(0,2)})}/><HubField label="Latitude" type="number" value={newHub.lat||""} onChange={value=>setNewHub({...newHub,lat:Number(value)})}/><HubField label="Longitude" type="number" value={newHub.lon||""} onChange={value=>setNewHub({...newHub,lon:Number(value)})}/><HubField label="Pontuação mínima" type="number" value={newHub.minimumScore} onChange={value=>setNewHub({...newHub,minimumScore:Number(value)})}/><div className="flex items-end"><Button type="button" onClick={addLocalHub} variant="outline" className="h-10 w-full border-[#0f766e] text-[#0f766e]">Adicionar hub</Button></div></div><div className="grid gap-4 md:grid-cols-2">{hubs.map(hub=><div key={`${hub.id??"novo"}-${hub.nome}`} className="rounded-xl border border-[#d9e4ea] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">{hub.isDefault?"Hub padrão":"Hub adicional"}</p><Button type="button" variant="ghost" size="sm" disabled={Boolean(hub.isDefault)} onClick={()=>removeLocalHub(hub)} className="text-[#a54b4b]">Remover</Button></div><div className="grid gap-3 sm:grid-cols-2"><HubField label="Nome" value={hub.nome} onChange={value=>updateLocalHub(hub,"nome",value)}/><HubField label="Cidade" value={hub.cidade} onChange={value=>updateLocalHub(hub,"cidade",value)}/><HubField label="UF" value={hub.uf} onChange={value=>updateLocalHub(hub,"uf",value.toUpperCase().slice(0,2))}/><HubField label="DDD" value={hub.ddd} onChange={value=>updateLocalHub(hub,"ddd",value.replace(/\D/g,"").slice(0,2))}/><HubField label="Latitude" type="number" value={hub.lat} onChange={value=>updateLocalHub(hub,"lat",Number(value))}/><HubField label="Longitude" type="number" value={hub.lon} onChange={value=>updateLocalHub(hub,"lon",Number(value))}/><HubField label="Pontuação mínima" type="number" value={hub.minimumScore} onChange={value=>updateLocalHub(hub,"minimumScore",Number(value))}/></div></div>)}</div></CardContent></Card><Card className="rounded-2xl border-0 bg-[#102a43] text-white"><CardContent className="grid gap-5 p-6 md:grid-cols-[auto_1fr]"><SlidersHorizontal size={22} className="text-[#8fcfc4]"/><div><p className="font-bold">Decisão de roteamento</p><p className="mt-2 text-sm leading-6 text-[#d6e4ea]">O score alcança o mínimo individual do hub; entre os hubs elegíveis, vence a menor distância. Em empate exato, o nome do hub define a ordem estável.</p></div></CardContent></Card></div><div className="mt-6 grid gap-6 xl:grid-cols-2"><RuleCard title="Pesos de pontuação" items={SCORE_RULES} rules={rules} onChange={updateRule} allowNegative/><RuleCard title="Limiares comerciais" items={LIMIT_RULES} rules={rules} onChange={updateRule}/></div><div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#8ccbc4] bg-[#eaf7f5] p-5"><div><p className="font-semibold text-[#164b46]">Pronto para gravar as alterações?</p><p className="mt-1 text-sm text-[#37605c]">Use a chave no topo e salve tudo em uma única operação.</p></div><div className="flex gap-3"><Button type="button" variant="outline" onClick={restoreAll} className="border-[#8ccbc4] bg-white">Restaurar pesos padrão</Button><Button onClick={saveAll} disabled={saving} className="bg-[#0f766e] text-white hover:bg-[#0b6059]"><Save size={16}/>{saving?"Salvando…":"Salvar configurações"}</Button></div></div></main></div>;
}

function RuleCard({title,items,rules,onChange,allowNegative=false}:{title:string;items:RuleItem[];rules:Rules;onChange:(key:keyof Rules,value:string)=>void;allowNegative?:boolean}) { return <Card className="rounded-2xl border-[#d9e4ea] bg-white"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Gauge size={18} className="text-[#0f766e]"/>{title}</CardTitle><p className="text-sm font-normal text-[#718596]">{allowNegative?"Use valores negativos para aplicar penalidades ao score.":"Estes valores definem faixas e mínimos; não aceitam números negativos."}</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([key,label,description])=><label key={key} className="rounded-xl border border-[#d9e4ea] bg-[#fbfcfc] p-3"><span className="block text-xs font-semibold">{label}</span><span className="block text-[11px] text-[#718596]">{description}</span><Input type="number" min={allowNegative?-100:(key==="capitalGrandeMin"||key==="capitalMediaMin"?0:1)} value={rules[key]} onChange={event=>onChange(key,event.target.value)} className="mt-2 h-9 bg-white"/></label>)}</CardContent></Card>; }
function HubField({label,value,onChange,type="text"}:{label:string;value:string|number;onChange:(value:string)=>void;type?:string}) { return <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#718596]">{label}</span><Input type={type} min={label === "Pontuação mínima" ? 1 : undefined} value={value} onChange={event=>onChange(event.target.value)} className="h-10"/></label>; }
