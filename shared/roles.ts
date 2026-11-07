/**
 * Cargos e permissões dentro de um clube.
 * Este arquivo é usado pelo servidor (para bloquear) e pelo app (para esconder botões),
 * então as duas pontas sempre concordam.
 */

export const ROLES = ["presidente", "diretoria", "tecnico", "jogador"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  presidente: "Presidente",
  diretoria: "Diretoria",
  tecnico: "Técnico",
  jogador: "Jogador",
};

/** Quanto maior, mais alto na hierarquia */
export const ROLE_RANK: Record<Role, number> = {
  presidente: 4,
  diretoria: 3,
  tecnico: 2,
  jogador: 1,
};

export type Capability =
  | "club.edit" // editar dados do clube, código de convite, excluir clube
  | "members.manage" // mudar cargos e remover associados
  | "teams.manage" // criar, editar e excluir times
  | "squad.manage" // jogadores, jogos e resultados
  | "finance.manage" // gerar e dar baixa em mensalidades
  | "notices.manage"; // publicar avisos

const CAPABILITIES: Record<Capability, Role[]> = {
  "club.edit": ["presidente"],
  "members.manage": ["presidente", "diretoria"],
  "teams.manage": ["presidente", "diretoria"],
  "squad.manage": ["presidente", "diretoria", "tecnico"],
  "finance.manage": ["presidente", "diretoria"],
  "notices.manage": ["presidente", "diretoria"],
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return CAPABILITIES[capability].includes(role);
}

/**
 * Quem pode alterar o cargo/remover outro associado:
 * - o presidente pode mexer em todos (menos em si mesmo);
 * - a diretoria só mexe em técnicos e jogadores.
 */
export function canManageMember(actor: Role, target: Role): boolean {
  if (!can(actor, "members.manage")) return false;
  if (actor === "presidente") return true;
  return ROLE_RANK[target] < ROLE_RANK[actor];
}

/** Cargos que um associado pode atribuir a outro */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "presidente") return [...ROLES];
  if (actor === "diretoria") return ["tecnico", "jogador"];
  return [];
}

export const CHANNELS = ["geral", "tecnicos", "diretoria"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_INFO: Record<Channel, { label: string; description: string; roles: Role[] }> = {
  geral: {
    label: "Geral",
    description: "Todos os associados",
    roles: ["presidente", "diretoria", "tecnico", "jogador"],
  },
  tecnicos: {
    label: "Comissão técnica",
    description: "Técnicos e diretoria",
    roles: ["presidente", "diretoria", "tecnico"],
  },
  diretoria: {
    label: "Diretoria",
    description: "Presidente e diretoria",
    roles: ["presidente", "diretoria"],
  },
};

export function canAccessChannel(role: Role | null | undefined, channel: Channel): boolean {
  return !!role && CHANNEL_INFO[channel].roles.includes(role);
}
