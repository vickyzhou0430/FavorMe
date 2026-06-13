/**
 * 点醒 · 历史记录列表页
 * 展示所有历史决策记录，点击进入详情
 */

import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, ArrowLeft, Flame } from 'lucide-react';

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663603030447/QpfKNWg9gqENqfFdxWBP3T/dianxing-logo-8PPzqLrHzu3v7Khx75RcHM.webp';

function formatDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function History() {
  const { data: sessions, isLoading } = trpc.history.list.useQuery({ page: 1 });

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.09 0.005 285)' }}>
      {/* 顶部装饰线 */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #E8A84C, transparent)' }} />

      {/* 导航栏 */}
      <div className="sticky top-0 z-10" style={{ background: 'oklch(0.09 0.005 285)', borderBottom: '1px solid oklch(0.16 0.006 285)' }}>
        <div className="container flex items-center gap-3 h-14">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm" style={{ color: 'oklch(0.55 0.01 65)' }}>
              <ArrowLeft size={16} />
              <span>返回</span>
            </button>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="点醒" className="w-5 h-5 rounded-full" />
            <span className="text-sm font-medium" style={{ color: '#E8A84C' }}>历史记录</span>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-24 rounded-xl animate-pulse"
                style={{ background: 'oklch(0.13 0.006 285)' }}
              />
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-20"
          >
            <Flame size={40} style={{ color: 'oklch(0.35 0.01 65)' }} />
            <p className="text-sm text-center" style={{ color: 'oklch(0.45 0.008 65)' }}>
              还没有历史记录
              <br />
              去说说你的纠结吧
            </p>
            <Link href="/">
              <button
                className="mt-2 px-5 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                style={{ background: 'rgba(232,168,76,0.15)', color: '#E8A84C', border: '1px solid rgba(232,168,76,0.3)' }}
              >
                开始测试
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs mb-2" style={{ color: 'oklch(0.45 0.008 65)' }}>
              共 {sessions.length} 条记录
            </p>
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <Link href={`/history/${session.id}`}>
                  <div
                    className="group flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: 'oklch(0.12 0.006 285)',
                      border: '1px solid oklch(0.18 0.006 285)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,168,76,0.3)';
                      (e.currentTarget as HTMLDivElement).style.background = 'oklch(0.14 0.007 285)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'oklch(0.18 0.006 285)';
                      (e.currentTarget as HTMLDivElement).style.background = 'oklch(0.12 0.006 285)';
                    }}
                  >
                    {/* 左侧内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 纠结描述 */}
                      <p
                        className="text-sm font-medium leading-snug line-clamp-2 mb-2"
                        style={{ color: '#F0EDE8' }}
                      >
                        {session.dilemma}
                      </p>

                      {/* 点醒金句（如有） */}
                      {session.awakeningQuote && (
                        <p
                          className="text-xs leading-relaxed line-clamp-1 mb-2"
                          style={{ color: '#E8A84C' }}
                        >
                          "{session.awakeningQuote}"
                        </p>
                      )}

                      {/* 底部元信息 */}
                      <div className="flex items-center gap-3">
                        {session.tendency && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(232,168,76,0.12)', color: '#E8A84C' }}
                          >
                            {session.tendency}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'oklch(0.45 0.008 65)' }}>
                          <Clock size={11} />
                          {formatDate(session.createdAt)}
                        </span>
                        <span className="text-xs" style={{ color: 'oklch(0.45 0.008 65)' }}>
                          {session.answersCount} 题
                        </span>
                      </div>
                    </div>

                    {/* 右侧箭头 */}
                    <ChevronRight
                      size={18}
                      className="shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
                      style={{ color: 'oklch(0.45 0.008 65)' }}
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
