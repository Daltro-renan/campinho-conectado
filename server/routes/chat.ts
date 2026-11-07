/** Chat do clube, separado em canais por cargo. */
import { Router } from "express";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { memberships, messages, users } from "@shared/schema";
import { canAccessChannel, type Channel, type Role } from "@shared/roles";
import { channelSchema, messageSchema } from "@shared/validation";
import type { MessageDTO } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx } from "../lib/club";
import { forbidden, notFound, parse, idParam } from "../lib/http";
import { can } from "@shared/roles";

export const chatRouter = Router({ mergeParams: true });

function channelParam(value: string | string[] | undefined, role: Role): Channel {
  const channel = parse(channelSchema, value);
  if (!canAccessChannel(role, channel)) throw forbidden("Você não tem acesso a este canal");
  return channel;
}

async function loadMessages(clubId: number, channel: Channel, afterId?: number): Promise<MessageDTO[]> {
  const conditions = [eq(messages.clubId, clubId), eq(messages.channel, channel)];
  if (afterId) conditions.push(gt(messages.id, afterId));

  const rows = await db
    .select({
      message: messages,
      authorName: users.name,
      authorAvatar: users.avatarUrl,
      authorRole: memberships.role,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.userId))
    .leftJoin(
      memberships,
      and(eq(memberships.userId, messages.userId), eq(memberships.clubId, messages.clubId)),
    )
    .where(and(...conditions))
    .orderBy(desc(messages.id))
    .limit(100);

  return rows.reverse().map((r) => ({
    id: r.message.id,
    channel: r.message.channel as Channel,
    content: r.message.content,
    createdAt: r.message.createdAt.toISOString(),
    author:
      r.message.userId && r.authorName
        ? {
            id: r.message.userId,
            name: r.authorName,
            avatarUrl: r.authorAvatar,
            role: (r.authorRole as Role | null) ?? null,
          }
        : null,
  }));
}

/** Últimas mensagens. Com ?after=ID devolve só as mais novas (para atualizar a tela). */
chatRouter.get("/chat/:channel", async (req, res) => {
  const { club, role } = clubCtx(req);
  const channel = channelParam(req.params.channel, role);
  const after = req.query.after ? idParam(String(req.query.after)) : undefined;
  res.json(await loadMessages(club.id, channel, after));
});

chatRouter.post("/chat/:channel", async (req, res) => {
  const { club, role } = clubCtx(req);
  const user = currentUser(req);
  const channel = channelParam(req.params.channel, role);
  const { content } = parse(messageSchema, req.body);

  const [created] = await db
    .insert(messages)
    .values({ clubId: club.id, userId: user.id, channel, content })
    .returning();

  const dto: MessageDTO = {
    id: created.id,
    channel,
    content: created.content,
    createdAt: created.createdAt.toISOString(),
    author: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role },
  };
  res.status(201).json(dto);
});

/** Apagar mensagem: o autor ou a diretoria */
chatRouter.delete("/chat/:channel/:messageId", async (req, res) => {
  const { club, role } = clubCtx(req);
  const user = currentUser(req);
  const channel = channelParam(req.params.channel, role);
  const [msg] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.id, idParam(req.params.messageId, "Mensagem")),
        eq(messages.clubId, club.id),
        eq(messages.channel, channel),
      ),
    );
  if (!msg) throw notFound("Mensagem não encontrada");
  if (msg.userId !== user.id && !can(role, "members.manage")) throw forbidden();
  await db.delete(messages).where(eq(messages.id, msg.id));
  res.json({ ok: true });
});
