import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertSalesHub, InsertUser, salesHubs, scoringParameters, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export const CONTROL_DEFAULT_HUBS = [
  { name: "Marília", city: "Marília", state: "SP", ddd: "14", latitude: -22.2139, longitude: -49.9458, minimumScore: 8, isDefault: 1 },
  { name: "Ribeirão Preto", city: "Ribeirão Preto", state: "SP", ddd: "16", latitude: -21.1775, longitude: -47.8103, minimumScore: 8, isDefault: 1 },
] as const;

export const CONTROL_DEFAULT_PARAMETERS = [
  ["situacaoAtiva", "Situação ativa", 1, "Pontos para cadastro ativo ou regular."],
  ["situacaoInativa", "Situação inativa", 0, "Pontos para cadastro sem situação ativa ou regular."],
  ["capitalGrande", "Capital grande", 3, "Pontos para capital social de grande porte."],
  ["capitalMedia", "Capital médio", 2, "Pontos para capital social de porte médio."],
  ["capitalPequena", "Capital pequeno", 1, "Pontos para capital social de porte pequeno."],
  ["capitalGrandeMin", "Capital grande: limite", 10_000_000, "Capital social mínimo da faixa grande."],
  ["capitalMediaMin", "Capital médio: limite", 1_000_000, "Capital social mínimo da faixa média."],
  ["capitalSemInformacao", "Capital não informado", 1, "Pontos conservadores para capital ausente."],
  ["cnaeA", "CNAE categoria A", 3, "Pontos para aderência industrial/produção."],
  ["cnaeB", "CNAE categoria B", 2, "Pontos para aderência intermediária."],
  ["cnaeSemClassificacao", "CNAE sem classificação", 1, "Pontos conservadores para CNAE não informado."],
  ["geoProximo", "Geografia próxima", 3, "Pontos para distância até 180 km."],
  ["geoSecundario", "Geografia secundária", 2, "Pontos para distância até 320 km."],
  ["geoDistante", "Geografia distante", 1, "Pontos para distância superior a 320 km."],
  ["geoProximoKm", "Raio geográfico próximo", 180, "Limite em quilômetros da faixa próxima."],
  ["geoSecundarioKm", "Raio geográfico secundário", 320, "Limite em quilômetros da faixa secundária."],
  ["dddMesmo", "DDD igual", 3, "Pontos quando o DDD coincide com o hub."],
  ["dddEstado", "DDD São Paulo", 2, "Pontos para outro DDD do estado de São Paulo."],
  ["dddOutro", "DDD externo", 1, "Pontos para DDD fora de São Paulo."],
  ["minimoExterno", "Pontuação mínima externa", 8, "Pontuação mínima para encaminhamento ao vendedor externo."],
] as const;

export async function ensureControlDefaults() {
  const db = await getDb();
  if (!db) return false;
  for (const hub of CONTROL_DEFAULT_HUBS) {
    await db.insert(salesHubs).values(hub).onDuplicateKeyUpdate({ set: { isDefault: sql`${salesHubs.isDefault}` } });
  }
  await db.update(salesHubs).set({ minimumScore: 8 }).where(and(eq(salesHubs.isDefault, 1), isNull(salesHubs.minimumScore)));
  for (const [key, label, value, description] of CONTROL_DEFAULT_PARAMETERS) {
    await db.insert(scoringParameters).values({ key, label, value, description }).onDuplicateKeyUpdate({ set: { value: sql`${scoringParameters.value}` } });
  }
  return true;
}

export async function getControlConfiguration() {
  const db = await getDb();
  if (!db) return { hubs: CONTROL_DEFAULT_HUBS.map(hub => ({ ...hub })), parameters: CONTROL_DEFAULT_PARAMETERS.map(([key, label, value, description]) => ({ key, label, value, description })) };
  await ensureControlDefaults();
  const [hubs, parameters] = await Promise.all([db.select().from(salesHubs).orderBy(asc(salesHubs.id)), db.select().from(scoringParameters).orderBy(asc(scoringParameters.id))]);
  return { hubs, parameters };
}

export async function createSalesHub(input: Omit<InsertSalesHub, "id" | "isDefault" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.insert(salesHubs).values({ ...input, isDefault: 0 });
  return (await db.select().from(salesHubs).where(eq(salesHubs.name, input.name)).limit(1))[0];
}

export async function updateSalesHub(id: number, input: Partial<Omit<InsertSalesHub, "id" | "isDefault" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.update(salesHubs).set(input).where(eq(salesHubs.id, id));
  return (await db.select().from(salesHubs).where(eq(salesHubs.id, id)).limit(1))[0];
}

export async function deleteSalesHub(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const current = (await db.select().from(salesHubs).where(eq(salesHubs.id, id)).limit(1))[0];
  if (!current) throw new Error("Hub não encontrado.");
  if (current.isDefault) throw new Error("Os hubs padrão não podem ser removidos.");
  await db.delete(salesHubs).where(eq(salesHubs.id, id));
  return { success: true };
}

export async function updateScoringParameter(key: string, value: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.update(scoringParameters).set({ value }).where(eq(scoringParameters.key, key));
  return (await db.select().from(scoringParameters).where(eq(scoringParameters.key, key)).limit(1))[0];
}

export async function restoreControlDefaults() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await ensureControlDefaults();
  for (const [key, _label, value] of CONTROL_DEFAULT_PARAMETERS) await db.update(scoringParameters).set({ value }).where(eq(scoringParameters.key, key));
  return getControlConfiguration();
}
