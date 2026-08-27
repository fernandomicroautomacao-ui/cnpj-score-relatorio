import { getStore } from "@netlify/blobs";
import { CONTROL_DEFAULT_HUBS, CONTROL_DEFAULT_PARAMETERS } from "../../server/db";

export type PublishedHub = { id: number; name: string; city: string; state: string; ddd: string | null; latitude: number; longitude: number; minimumScore: number; isDefault: number };
export type PublishedParameter = { key: string; label: string; value: number; description: string };
export type PublishedControlConfiguration = { hubs: PublishedHub[]; parameters: PublishedParameter[] };

const STORE_NAME = "cnpj-score-control";
const CONFIG_KEY = "current";
let localFallback: PublishedControlConfiguration | null = null;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export function createDefaultPublishedConfiguration(): PublishedControlConfiguration {
  return {
    hubs: CONTROL_DEFAULT_HUBS.map((hub, index) => ({ ...hub, id: index + 1 })),
    parameters: CONTROL_DEFAULT_PARAMETERS.map(([key, label, value, description]) => ({ key, label, value, description })),
  };
}
function normalize(value: PublishedControlConfiguration): PublishedControlConfiguration {
  return {
    hubs: value.hubs.map((hub, index) => ({ ...hub, id: Number(hub.id) || index + 1, ddd: hub.ddd || null, minimumScore: Number(hub.minimumScore) || 8, isDefault: hub.isDefault ? 1 : 0 })),
    parameters: value.parameters.map(parameter => ({ ...parameter, value: Number(parameter.value) })),
  };
}
async function readBlob(): Promise<PublishedControlConfiguration | null> {
  try {
    const store = getStore(STORE_NAME);
    const stored = await store.get(CONFIG_KEY, { type: "json", consistency: "strong" }) as PublishedControlConfiguration | null;
    return stored ? normalize(stored) : null;
  } catch { return null; }
}
async function writeBlob(configuration: PublishedControlConfiguration) {
  try {
    const store = getStore(STORE_NAME);
    await store.setJSON(CONFIG_KEY, configuration);
    localFallback = clone(configuration);
  } catch {
    localFallback = clone(configuration);
  }
}
export async function getPublishedControlConfiguration() {
  const stored = await readBlob();
  if (stored) return stored;
  if (localFallback) return clone(localFallback);
  return createDefaultPublishedConfiguration();
}
export async function mutatePublishedControl(action: string, body: { id?: number; data?: Record<string, unknown>; key?: string; value?: number }) {
  const configuration = await getPublishedControlConfiguration();
  if (action === "createHub") {
    const data = body.data ?? {};
    const name = String(data.name ?? "").trim(); const city = String(data.city ?? "").trim(); const state = String(data.state ?? "").trim().toUpperCase();
    const latitude = Number(data.latitude); const longitude = Number(data.longitude); const minimumScore = Number(data.minimumScore);
    if (!name || !city || !state || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isInteger(minimumScore) || minimumScore < 1 || minimumScore > 100) throw new Error("Dados do hub inválidos.");
    if (configuration.hubs.some(hub => hub.name.toLowerCase() === name.toLowerCase())) throw new Error("Já existe um hub com esse nome.");
    configuration.hubs.push({ id:Math.max(0, ...configuration.hubs.map(hub => hub.id)) + 1, name, city, state, ddd:data.ddd ? String(data.ddd) : null, latitude, longitude, minimumScore, isDefault:0 });
  } else if (action === "updateHub") {
    const hub = configuration.hubs.find(item => item.id === body.id);
    if (!hub) throw new Error("Hub não encontrado.");
    const data = body.data ?? {}; const minimumScore = Number(data.minimumScore);
    if (!Number.isInteger(minimumScore) || minimumScore < 1 || minimumScore > 100) throw new Error("A pontuação mínima do hub deve estar entre 1 e 100.");
    const nextName = String(data.name ?? hub.name).trim();
    if (configuration.hubs.some(item => item.id !== hub.id && item.name.toLowerCase() === nextName.toLowerCase())) throw new Error("Já existe um hub com esse nome.");
    Object.assign(hub, { name:nextName, city:String(data.city ?? hub.city).trim(), state:String(data.state ?? hub.state).trim().toUpperCase(), ddd:data.ddd ? String(data.ddd) : null, latitude:Number(data.latitude), longitude:Number(data.longitude), minimumScore });
  } else if (action === "deleteHub") {
    const hub = configuration.hubs.find(item => item.id === body.id);
    if (!hub) throw new Error("Hub não encontrado.");
    if (hub.isDefault) throw new Error("Os hubs padrão não podem ser removidos.");
    configuration.hubs = configuration.hubs.filter(item => item.id !== body.id);
  } else if (action === "updateParameter") {
    if (!body.key || !Number.isInteger(body.value)) throw new Error("Parâmetro inválido.");
    const parameter = configuration.parameters.find(item => item.key === body.key);
    if (!parameter) throw new Error("Parâmetro não encontrado.");
    parameter.value = body.value;
  } else if (action === "restoreDefaults") {
    const defaults = createDefaultPublishedConfiguration();
    configuration.parameters = defaults.parameters;
  } else throw new Error("Operação de controle inválida.");
  await writeBlob(configuration);
  return configuration;
}
