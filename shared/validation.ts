/**
 * Validação dos dados enviados pelo app (usada no servidor e nos formulários).
 * Mensagens em português porque aparecem para o usuário.
 */
import { z } from "zod";
import { ROLES, CHANNELS } from "./roles";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v || null));
const optionalUrl = z
  .string()
  .trim()
  .url("Endereço inválido")
  .max(1000)
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

// ---------- Conta ----------

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80).optional(),
  avatarUrl: optionalUrl,
  phone: optionalText(30),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(20, "Login com Google inválido"),
});

export const changePasswordSchema = z.object({
  /** Opcional para contas criadas com o Google, que ainda não têm senha */
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres").max(100),
});

export const deleteAccountSchema = z.object({
  password: z.string().optional(),
  /** Contas só com Google confirmam digitando o e-mail */
  confirmEmail: z.string().optional(),
});

// ---------- Clube ----------

export const CREST_SHAPES = ["classico", "moderno", "pontudo", "redondo", "hexagono"] as const;
export type CrestShape = (typeof CREST_SHAPES)[number];
export const CREST_SHAPE_LABELS: Record<CrestShape, string> = {
  classico: "Clássico",
  moderno: "Moderno",
  pontudo: "Pontudo",
  redondo: "Redondo",
  hexagono: "Hexágono",
};

/** Logo enviado pelo app (imagem em data URL, já reduzida) ou um endereço https */
const logoImage = z
  .string()
  .max(400_000, "Imagem muito grande. Use uma imagem menor.")
  .refine((v) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) || /^https:\/\//.test(v), "Imagem inválida")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

export const clubSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do clube").max(80),
  abbreviation: z
    .string()
    .trim()
    .min(2, "Use de 2 a 4 letras")
    .max(4, "Use de 2 a 4 letras")
    .transform((v) => v.toUpperCase()),
  city: optionalText(60),
  state: optionalText(2).transform((v) => (typeof v === "string" ? v.toUpperCase() : v)),
  foundedYear: z.coerce.number().int().min(1850).max(2100).optional().nullable(),
  description: optionalText(500),
  logoUrl: logoImage,
  crestShape: z.enum(CREST_SHAPES).optional(),
  colorPrimary: hexColor.optional(),
  colorSecondary: hexColor.optional(),
  monthlyFee: z.coerce.number().int().min(0).max(10_000_00).optional(),
  dueDay: z.coerce.number().int().min(1).max(28).optional(),
  pixKey: optionalText(120),
});
export const updateClubSchema = clubSchema.partial();

export const joinClubSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, "Código inválido")
    .max(12, "Código inválido"),
});

export const updateMemberSchema = z.object({
  role: z.enum(ROLES).optional(),
  feeExempt: z.boolean().optional(),
});

// ---------- Times e jogadores ----------

export const teamSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do time").max(60),
  abbreviation: z
    .string()
    .trim()
    .min(2, "Use de 2 a 4 letras")
    .max(4, "Use de 2 a 4 letras")
    .transform((v) => v.toUpperCase()),
  category: z.string().trim().min(1, "Informe a categoria").max(40),
  colorPrimary: hexColor,
  colorSecondary: hexColor,
  description: optionalText(500),
  coachUserId: z.coerce.number().int().positive().optional().nullable(),
});
export const updateTeamSchema = teamSchema.partial();

export const PLAYER_POSITIONS = [
  "Goleiro",
  "Zagueiro",
  "Lateral",
  "Volante",
  "Meia",
  "Ponta",
  "Atacante",
] as const;

export const PLAYER_STATUSES = ["ativo", "lesionado", "suspenso", "inativo"] as const;

export const playerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80),
  nickname: optionalText(40),
  position: z.enum(PLAYER_POSITIONS, { message: "Escolha a posição" }),
  shirtNumber: z.coerce.number().int().min(0).max(99).optional().nullable(),
  teamId: z.coerce.number().int().positive().optional().nullable(),
  userId: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(PLAYER_STATUSES).optional(),
  isCaptain: z.boolean().optional(),
  goals: z.coerce.number().int().min(0).max(9999).optional(),
  assists: z.coerce.number().int().min(0).max(9999).optional(),
  yellowCards: z.coerce.number().int().min(0).max(999).optional(),
  redCards: z.coerce.number().int().min(0).max(999).optional(),
  gamesPlayed: z.coerce.number().int().min(0).max(9999).optional(),
});
export const updatePlayerSchema = playerSchema.partial();

// ---------- Jogos ----------

export const COMPETITIONS = ["campeonato", "amistoso", "copa", "treino"] as const;
export const COMPETITION_LABELS: Record<(typeof COMPETITIONS)[number], string> = {
  campeonato: "Campeonato",
  amistoso: "Amistoso",
  copa: "Copa",
  treino: "Treino",
};
export const GAME_STATUSES = ["agendado", "finalizado", "cancelado"] as const;

const gameBase = z.object({
  teamId: z.coerce.number().int().positive({ message: "Escolha o time" }),
  opponentTeamId: z.coerce.number().int().positive().optional().nullable(),
  opponentName: optionalText(80),
  isHome: z.boolean().default(true),
  competition: z.enum(COMPETITIONS).default("amistoso"),
  competitionName: optionalText(80),
  startsAt: z.coerce.date({ message: "Informe data e hora" }),
  location: optionalText(120),
  notes: optionalText(500),
});

export const gameSchema = gameBase.refine((g) => g.opponentTeamId || g.opponentName, {
  message: "Escolha um time do clube ou digite o nome do adversário",
  path: ["opponentName"],
});

export const updateGameSchema = gameBase.partial().extend({
  status: z.enum(GAME_STATUSES).optional(),
  teamScore: z.coerce.number().int().min(0).max(99).optional().nullable(),
  opponentScore: z.coerce.number().int().min(0).max(99).optional().nullable(),
});

export const ATTENDANCE_STATUSES = ["confirmado", "ausente"] as const;
export const attendanceSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
});

// ---------- Mensalidades ----------

export const PAYMENT_METHODS = ["pix", "dinheiro", "cartao", "transferencia"] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
};

const referenceMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido");

export const generateDuesSchema = z.object({
  referenceMonth,
});

export const createDueSchema = z.object({
  userId: z.coerce.number().int().positive(),
  referenceMonth,
  amount: z.coerce.number().int().min(1, "Informe o valor"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  notes: optionalText(200),
});

export const markDuePaidSchema = z.object({
  paid: z.boolean(),
  method: z.enum(PAYMENT_METHODS).optional().nullable(),
  notes: optionalText(200),
});

export const connectMercadoPagoSchema = z.object({
  accessToken: z
    .string()
    .trim()
    .regex(/^(APP_USR|TEST)-[\w-]{20,}$/, "Cole o Access Token completo (começa com APP_USR-)"),
});

// ---------- Chat e avisos ----------

export const messageSchema = z.object({
  content: z.string().trim().min(1, "Mensagem vazia").max(1000, "Mensagem muito longa"),
});

export const channelSchema = z.enum(CHANNELS, { message: "Canal inválido" });

export const noticeSchema = z.object({
  title: z.string().trim().min(2, "Informe o título").max(100),
  body: z.string().trim().min(2, "Escreva o aviso").max(2000),
  pinned: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ClubInput = z.input<typeof clubSchema>;
export type TeamInput = z.input<typeof teamSchema>;
export type PlayerInput = z.input<typeof playerSchema>;
export type GameInput = z.input<typeof gameSchema>;
export type UpdateGameInput = z.input<typeof updateGameSchema>;
