/**
 * 点醒 · 历史记录详情页
 * 展示单次决策的完整流程回顾
 */

import { trpc } from '@/lib/trpc';
import { Link, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare, HelpCircle, CheckCircle2, Sparkles } from 'lucide-react';

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663603030447/QpfKNWg9gqENqfFdxWBP3T/dianxing-logo-8PPzqLrHzu3v7Khx75RcHM.webp';

type ChoiceLevel = 'A' | '偏A' | '中间' | '偏B' | 'B';

interface AnswerRecord {
  question: string;
  option_a: string;
  option_b: string;
  chosen: ChoiceLevel;
  chosen_text: string;
  strategy: string;
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? '0', 10);

  const { data: session, isLoading } = trpc.history.getById.useQuery(
    { id },
    { enabled: !!id && !isNaN(id) }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.09 0.005 285)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E8A84C', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'oklch(0.45 0.008 65)' }}>加载中…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'oklch(0.09 0.005 285)' }}>
        <p className="text-sm" style={{ color: 'oklch(0.45 0.008 65)' }}>记录不存在</p>
        <Link href="/history">
          <button className="text-sm" style={{ color: '#E8A84C' }}>返回列表</button>
        </Link>
      </div>
    );
  }

  const answers = session.answers as AnswerRecord[];

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.09 0.005 285)' }}>
      {/* 顶部装饰线 */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #E8A84C, transparent)' }} />

      {/* 导航栏 */}
      <div className="sticky top-0 z-10" style={{ background: 'oklch(0.09 0.005 285)', borderBottom: '1px solid oklch(0.16 0.006 285)' }}>
        <div className="container flex items-center gap-3 h-14">
          <Link href="/history">
            <button className="flex items-center gap-1.5 text-sm" style={{ color: 'oklch(0.55 0.01 65)' }}>
              <ArrowLeft size={16} />
              <span>历史记录</span>
            </button>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="点醒" className="w-5 h-5 rounded-full" />
          </div>
        </div>
      </div>

      <div className="container py-8 flex flex-col gap-6">
        {/* 时间 */}
        <p className="text-xs" style={{ color: 'oklch(0.45 0.008 65)' }}>
          {formatDate(session.createdAt)}
        </p>

        {/* Step 1: 用户的纠结描述 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={14} style={{ color: '#E8A84C' }} />
            <span className="text-xs tracking-wider uppercase" style={{ color: 'oklch(0.55 0.01 65)' }}>你的纠结</span>
          </div>
          <div
            className="px-4 py-3 rounded-xl text-sm leading-relaxed"
            style={{ background: 'oklch(0.13 0.006 285)', color: '#F0EDE8' }}
          >
            {session.dilemma}
          </div>
        </motion.div>

        {/* Step 2: AI追问（如有） */}
        <AnimatePresence>
          {session.clarifyQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <HelpCircle size={14} style={{ color: 'oklch(0.6 0.01 200)' }} />
                <span className="text-xs tracking-wider uppercase" style={{ color: 'oklch(0.55 0.01 65)' }}>点醒追问</span>
              </div>
              <div
                className="px-4 py-3 rounded-xl text-sm leading-relaxed"
                style={{ background: 'oklch(0.12 0.008 200)', color: 'oklch(0.82 0.01 200)', border: '1px solid oklch(0.2 0.01 200)' }}
              >
                {session.clarifyQuestion}
              </div>
              {session.clarifyAnswer && (
                <div
                  className="px-4 py-3 rounded-xl text-sm leading-relaxed ml-4"
                  style={{ background: 'oklch(0.13 0.006 285)', color: '#F0EDE8' }}
                >
                  {session.clarifyAnswer}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: 题目与选择 */}
        {answers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} style={{ color: '#E8A84C' }} />
              <span className="text-xs tracking-wider uppercase" style={{ color: 'oklch(0.55 0.01 65)' }}>你的选择轨迹</span>
            </div>
            <div className="flex flex-col gap-3">
              {answers.map((a, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 p-4 rounded-xl"
                  style={{ background: 'oklch(0.12 0.006 285)', border: '1px solid oklch(0.18 0.006 285)' }}
                >
                  {/* 策略标签 */}
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'oklch(0.18 0.006 285)', color: 'oklch(0.55 0.01 65)' }}
                    >
                      第{i + 1}题 · {a.strategy}
                    </span>
                  </div>
                  {/* 问题 */}
                  <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.78 0.008 65)' }}>
                    {a.question}
                  </p>
                  {/* 五级选择展示 */}
                  <div className="mt-2 flex flex-col gap-2">
                    {/* 两端选项文字 */}
                    <div className="flex justify-between gap-3">
                      <span className="text-xs leading-relaxed flex-1"
                        style={{ color: ['A', '偏A'].includes(a.chosen) ? '#E8A84C' : 'oklch(0.55 0.01 65)' }}>
                        {a.option_a}
                      </span>
                      <span className="text-xs leading-relaxed flex-1 text-right"
                        style={{ color: ['B', '偏B'].includes(a.chosen) ? '#E8A84C' : 'oklch(0.55 0.01 65)' }}>
                        {a.option_b}
                      </span>
                    </div>
                    {/* 五级指示器 */}
                    <div className="flex items-center justify-between px-1">
                      {(['A', '偏A', '中间', '偏B', 'B'] as ChoiceLevel[]).map((level) => {
                        const isChosen = a.chosen === level;
                        return (
                          <div key={level} className="flex flex-col items-center gap-1">
                            <div
                              className="rounded-full"
                              style={{
                                width: isChosen ? 20 : 12,
                                height: isChosen ? 20 : 12,
                                background: isChosen ? '#E8A84C' : 'oklch(0.22 0.006 285)',
                                border: isChosen ? '2px solid rgba(232,168,76,0.4)' : '1px solid oklch(0.28 0.006 285)',
                                transition: 'all 200ms',
                              }}
                            />
                            <span className="text-xs" style={{ color: isChosen ? '#E8A84C' : 'oklch(0.35 0.006 285)', fontSize: 10 }}>
                              {level}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* 选择文字说明 */}
                    <p className="text-xs" style={{ color: '#E8A84C' }}>
                      你选了「{a.chosen}」：{a.chosen_text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 4: 点醒报告 */}
        {session.awakeningQuote && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: '#E8A84C' }} />
              <span className="text-xs tracking-wider uppercase" style={{ color: 'oklch(0.55 0.01 65)' }}>点醒报告</span>
            </div>

            {/* 金句 */}
            <div className="py-5 px-4 rounded-xl" style={{ background: 'oklch(0.12 0.007 75)', border: '1px solid rgba(232,168,76,0.2)' }}>
              <div className="thin-divider mb-4" style={{ background: 'rgba(232,168,76,0.3)', height: '1px' }} />
              <p
                className="text-base leading-relaxed font-semibold"
                style={{ fontFamily: "'Noto Serif SC', serif", color: '#F0EDE8' }}
              >
                {session.awakeningQuote}
              </p>
              <div className="thin-divider mt-4" style={{ background: 'rgba(232,168,76,0.3)', height: '1px' }} />
            </div>

            {/* 倾向 */}
            {session.tendency && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs" style={{ color: 'oklch(0.45 0.008 65)' }}>内心真实的倾向</p>
                <div
                  className="px-4 py-2.5 rounded-lg"
                  style={{ background: 'rgba(232,168,76,0.08)', border: '1px solid rgba(232,168,76,0.25)' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#E8A84C' }}>{session.tendency}</p>
                </div>
              </div>
            )}

            {/* 分析 */}
            {session.analysis && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs" style={{ color: 'oklch(0.45 0.008 65)' }}>潜意识分析</p>
                <p className="text-sm leading-7" style={{ color: 'oklch(0.72 0.008 65)' }}>
                  {session.analysis}
                </p>
              </div>
            )}

            {/* 行动建议 */}
            {session.actionAdvice && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs" style={{ color: 'oklch(0.45 0.008 65)' }}>接下来可以做的一件事</p>
                <div
                  className="px-4 py-4 rounded-xl"
                  style={{ background: 'oklch(0.13 0.007 75)' }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.82 0.01 65)' }}>
                    {session.actionAdvice}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 底部操作 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3 pt-4"
        >
          <Link href="/" className="flex-1">
            <button
              className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ background: 'rgba(232,168,76,0.15)', color: '#E8A84C', border: '1px solid rgba(232,168,76,0.3)' }}
            >
              再问一个纠结
            </button>
          </Link>
          <Link href="/history">
            <button
              className="px-5 py-3 rounded-xl text-sm transition-all active:scale-95"
              style={{ background: 'oklch(0.14 0.006 285)', color: 'oklch(0.55 0.01 65)', border: '1px solid oklch(0.2 0.006 285)' }}
            >
              列表
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
