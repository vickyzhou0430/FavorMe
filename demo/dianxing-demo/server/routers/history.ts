/**
 * 点醒 · 历史记录路由
 * 提供保存、查询列表、查询详情三个接口
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import {
  saveDecisionSession,
  listDecisionSessions,
  getDecisionSessionById,
} from '../db';

// 答题记录的 Schema
const AnswerRecordSchema = z.object({
  question: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  chosen: z.enum(['A', '偏A', '中间', '偏B', 'B']),
  chosen_text: z.string(),
  strategy: z.string(),
});

export const historyRouter = router({
  /** 保存完整决策会话，返回新记录 id */
  save: publicProcedure
    .input(
      z.object({
        dilemma: z.string(),
        clarifyQuestion: z.string().optional(),
        clarifyAnswer: z.string().optional(),
        answers: z.array(AnswerRecordSchema),
        awakeningQuote: z.string().optional(),
        analysis: z.string().optional(),
        tendency: z.string().optional(),
        actionAdvice: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await saveDecisionSession({
        dilemma: input.dilemma,
        clarifyQuestion: input.clarifyQuestion ?? null,
        clarifyAnswer: input.clarifyAnswer ?? null,
        answers: JSON.stringify(input.answers),
        awakeningQuote: input.awakeningQuote ?? null,
        analysis: input.analysis ?? null,
        tendency: input.tendency ?? null,
        actionAdvice: input.actionAdvice ?? null,
      });
      return { id };
    }),

  /** 查询历史记录列表（最新在前，每页20条） */
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
      }).optional()
    )
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = 20;
      const offset = (page - 1) * limit;
      const sessions = await listDecisionSessions(limit, offset);
      return sessions.map(s => ({
        id: s.id,
        dilemma: s.dilemma,
        tendency: s.tendency,
        awakeningQuote: s.awakeningQuote,
        answersCount: (() => {
          try { return (JSON.parse(s.answers || '[]') as unknown[]).length; } catch { return 0; }
        })(),
        createdAt: s.createdAt,
      }));
    }),

  /** 查询单条历史记录详情 */
  getById: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const session = await getDecisionSessionById(input.id);
      if (!session) return null;
      return {
        ...session,
        answers: (() => {
          try { return JSON.parse(session.answers || '[]'); } catch { return []; }
        })(),
      };
    }),
});
