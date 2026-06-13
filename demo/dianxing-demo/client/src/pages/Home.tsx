/**
 * 点醒 · 主页
 * 设计哲学：深夜诊室 — 克制、深邃、直击内心
 * 琥珀金 #E8A84C 作为唯一强调色
 */

import { useState, useRef, useEffect } from 'react';
import { useDecisionAI, type ChoiceLevel } from '@/hooks/useDecisionAI';
import { TypewriterText } from '@/components/TypewriterText';
import { LoadingDots } from '@/components/LoadingDots';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { History } from 'lucide-react';

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663603030447/QpfKNWg9gqENqfFdxWBP3T/dianxing-logo-8PPzqLrHzu3v7Khx75RcHM.webp';
const HERO_BG_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663603030447/QpfKNWg9gqENqfFdxWBP3T/dianxing-hero-bg-B5DGpoi9RzTZpPoQRaE4Nr.webp';

const PRESET_DILEMMAS = [
  '要不要辞掉现在的工作去创业',
  '纠结两个offer，一个稳定一个有挑战',
  '要不要主动联系一个很久没联系的人',
];

// 进度指示器
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`progress-dot ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}
        />
      ))}
    </div>
  );
}

// 五级程度选择器
const CHOICE_LEVELS: { value: ChoiceLevel; label: string; size: 'lg' | 'md' | 'sm' | 'md' | 'lg' }[] = [
  { value: 'A', label: 'A', size: 'lg' },
  { value: '偏A', label: '偏A', size: 'md' },
  { value: '中间', label: '中', size: 'sm' },
  { value: '偏B', label: '偏B', size: 'md' },
  { value: 'B', label: 'B', size: 'lg' },
];

function ScaleSelector({
  optionA,
  optionB,
  selected,
  onSelect,
  disabled,
}: {
  optionA: string;
  optionB: string;
  selected: ChoiceLevel | null;
  onSelect: (choice: ChoiceLevel) => void;
  disabled: boolean;
}) {
  const sizeMap = {
    lg: { outer: 44, inner: 32 },
    md: { outer: 36, inner: 24 },
    sm: { outer: 28, inner: 18 },
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 选项文字 */}
      <div className="flex justify-between gap-4">
        <div
          className="flex-1 text-sm leading-relaxed"
          style={{ color: selected === 'A' || selected === '偏A' ? '#E8A84C' : 'oklch(0.72 0.008 65)' }}
        >
          {optionA}
        </div>
        <div
          className="flex-1 text-sm leading-relaxed text-right"
          style={{ color: selected === 'B' || selected === '偏B' ? '#E8A84C' : 'oklch(0.72 0.008 65)' }}
        >
          {optionB}
        </div>
      </div>

      {/* 五级按鈕行 */}
      <div className="flex items-center justify-between px-2">
        {CHOICE_LEVELS.map((level) => {
          const isSelected = selected === level.value;
          const { outer, inner } = sizeMap[level.size];
          return (
            <button
              key={level.value}
              onClick={() => !disabled && onSelect(level.value)}
              disabled={disabled}
              className="flex flex-col items-center gap-1.5 group"
              style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              {/* 圆圈 */}
              <div
                className="rounded-full flex items-center justify-center transition-all"
                style={{
                  width: outer,
                  height: outer,
                  background: isSelected ? 'rgba(232,168,76,0.15)' : 'transparent',
                  border: `1.5px solid ${isSelected ? '#E8A84C' : 'oklch(0.28 0.006 285)'}`,
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 160ms cubic-bezier(0.23,1,0.32,1)',
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: inner,
                    height: inner,
                    background: isSelected ? '#E8A84C' : 'oklch(0.22 0.006 285)',
                    transition: 'all 160ms cubic-bezier(0.23,1,0.32,1)',
                  }}
                />
              </div>
              {/* 标签 */}
              <span
                className="text-xs"
                style={{
                  color: isSelected ? '#E8A84C' : 'oklch(0.4 0.008 65)',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'color 160ms',
                }}
              >
                {level.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 连接线 */}
      <div className="relative -mt-10 mb-2 mx-6 h-px" style={{ background: 'oklch(0.22 0.006 285)' }} />
    </div>
  );
}

// 结果报告页
function ReportPage({
  report,
  answers,
  onReset,
}: {
  report: NonNullable<ReturnType<typeof useDecisionAI>['report']>;
  answers: ReturnType<typeof useDecisionAI>['answers'];
  onReset: () => void;
}) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="min-h-screen flex flex-col"
    >
      {/* 顶部装饰 */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #E8A84C, transparent)' }} />

      <div className="container flex-1 py-10 flex flex-col gap-8">
        {/* 标签 */}
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="点醒" className="w-5 h-5 rounded-full" />
          <span className="text-xs tracking-widest uppercase" style={{ color: '#E8A84C' }}>点醒报告</span>
        </div>

        {/* 金句 */}
        <div className="py-6">
          <div className="thin-divider mb-6" />
          <h1
            className="text-xl leading-relaxed font-semibold amber-glow-text"
            style={{
              fontFamily: "'Noto Serif SC', serif",
              color: '#F0EDE8',
            }}
          >
            <TypewriterText
              text={report.awakening_quote}
              speed={40}
              onComplete={() => setShowAnalysis(true)}
            />
          </h1>
          <div className="thin-divider mt-6" />
        </div>

        {/* 你的倾向 */}
        <AnimatePresence>
          {showAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-2"
            >
              <p className="text-xs tracking-widest uppercase" style={{ color: 'oklch(0.55 0.01 65)' }}>你内心真实的倾向</p>
              <div
                className="px-4 py-3 rounded-lg border"
                style={{ borderColor: '#E8A84C', background: 'rgba(232, 168, 76, 0.08)' }}
              >
                <p className="text-sm font-medium" style={{ color: '#E8A84C' }}>{report.tendency}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 分析 */}
        <AnimatePresence>
          {showAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col gap-3"
            >
              <p className="text-xs tracking-widest uppercase" style={{ color: 'oklch(0.55 0.01 65)' }}>潜意识分析</p>
              <p
                className="text-sm leading-7"
                style={{ color: 'oklch(0.72 0.008 65)' }}
              >
                <TypewriterText
                  text={report.analysis}
                  speed={15}
                  onComplete={() => setShowAdvice(true)}
                />
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 答题回顾 */}
        <AnimatePresence>
          {showAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-col gap-3"
            >
              <p className="text-xs tracking-widest uppercase" style={{ color: 'oklch(0.55 0.01 65)' }}>你的选择轨迹</p>
              <div className="flex flex-col gap-2">
                {answers.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: 'oklch(0.12 0.006 285)' }}
                  >
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5"
                      style={{ background: '#E8A84C', color: 'oklch(0.09 0.005 285)' }}
                    >
                      {a.chosen}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.65 0.008 65)' }}>
                      {a.chosen_text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 行动建议 */}
        <AnimatePresence>
          {showAdvice && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-3"
            >
              <p className="text-xs tracking-widest uppercase" style={{ color: 'oklch(0.55 0.01 65)' }}>接下来可以做的一件事</p>
              <div
                className="px-4 py-4 rounded-lg"
                style={{ background: 'oklch(0.13 0.007 75)' }}
              >
                <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.82 0.01 65)' }}>
                  {report.action_advice}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 重新开始 */}
        <AnimatePresence>
          {showAdvice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="pt-4 pb-8"
            >
              <button
                onClick={onReset}
                className="w-full py-3 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  border: '1px solid oklch(0.22 0.006 285)',
                  color: 'oklch(0.55 0.01 65)',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLButtonElement).style.borderColor = '#E8A84C';
                  (e.target as HTMLButtonElement).style.color = '#E8A84C';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.borderColor = 'oklch(0.22 0.006 285)';
                  (e.target as HTMLButtonElement).style.color = 'oklch(0.55 0.01 65)';
                }}
              >
                再测一个纠结
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ==================== 主页面 ====================

export default function Home() {
  const {
    status,
    currentQuestion,
    clarifyQuestion,
    report,
    answers,
    questionCount,
    isLoading,
    error,
    submitDilemma,
    submitClarification,
    submitAnswer,
    reset,
  } = useDecisionAI();

  const [inputValue, setInputValue] = useState('');
  const [clarifyValue, setClarifyValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<ChoiceLevel | null>(null);
  const [questionVisible, setQuestionVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // 每次新问题出现时，重置选项状态
  useEffect(() => {
    if (status === 'questioning' && currentQuestion) {
      setSelectedOption(null);
      setQuestionVisible(false);
      // 短暂延迟后显示问题（等待动画）
      setTimeout(() => setQuestionVisible(true), 100);
    }
  }, [currentQuestion, status]);

  // 滚动到顶部
  useEffect(() => {
    if (status !== 'idle') {
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [status]);

  const handleSubmitDilemma = async () => {
    const val = inputValue.trim();
    if (!val || isLoading) return;
    await submitDilemma(val);
    setInputValue('');
  };

  const handleSubmitClarify = async () => {
    const val = clarifyValue.trim();
    if (!val || isLoading) return;
    await submitClarification(val);
    setClarifyValue('');
  };

  const handleSelectOption = async (choice: ChoiceLevel) => {
    if (isLoading || selectedOption) return;
    setSelectedOption(choice);
    // 短暂延迟，让用户看到选中效果
    setTimeout(() => {
      submitAnswer(choice);
    }, 600);
  };

  const handlePreset = (text: string) => {
    setInputValue(text);
    textareaRef.current?.focus();
  };

  // 结果页
  if (status === 'finished' && report) {
    return <ReportPage report={report} answers={answers} onReset={reset} />;
  }

  return (
    <div className="min-h-screen flex flex-col" ref={topRef}>
      {/* 背景图 */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${HERO_BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.6,
        }}
      />
      <div className="fixed inset-0 z-0" style={{ background: 'oklch(0.09 0.005 285 / 0.85)' }} />

      {/* 内容 */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* 顶部导航 */}
        <header className="container py-5 flex items-center gap-2.5">
          <img src={LOGO_URL} alt="点醒" className="w-7 h-7 rounded-full" />
          <span
            className="text-base font-semibold tracking-wider"
            style={{ fontFamily: "'Noto Serif SC', serif", color: '#F0EDE8' }}
          >
            点醒
          </span>
          <div className="flex-1" />
          <Link href="/history">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all active:scale-95"
              style={{ background: 'oklch(0.14 0.006 285)', color: 'oklch(0.55 0.01 65)', border: '1px solid oklch(0.2 0.006 285)' }}
            >
              <History size={13} />
              <span>历史</span>
            </button>
          </Link>
        </header>

        {/* 主内容区 */}
        <main className="container flex-1 flex flex-col justify-center py-6">
          <AnimatePresence mode="wait">

            {/* === 首页：倾诉阶段 === */}
            {status === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-8"
              >
                {/* 标题区 */}
                <div className="flex flex-col gap-3 pt-4">
                  <h1
                    className="text-3xl font-bold leading-tight"
                    style={{ fontFamily: "'Noto Serif SC', serif", color: '#F0EDE8' }}
                  >
                    你已经知道答案了
                  </h1>
                  <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0.01 65)' }}>
                    只是还没敢承认。说出你的纠结，我来帮你照见内心。
                  </p>
                </div>

                {/* 输入区 */}
                <div className="flex flex-col gap-3">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitDilemma();
                      }
                    }}
                    placeholder="说说你在纠结什么……"
                    rows={4}
                    className="w-full resize-none rounded-xl px-4 py-3.5 text-sm leading-relaxed outline-none transition-all duration-200"
                    style={{
                      background: 'oklch(0.12 0.006 285)',
                      border: '1px solid oklch(0.22 0.006 285)',
                      color: '#F0EDE8',
                      caretColor: '#E8A84C',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'rgba(232, 168, 76, 0.5)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'oklch(0.22 0.006 285)';
                    }}
                  />

                  <button
                    onClick={handleSubmitDilemma}
                    disabled={!inputValue.trim() || isLoading}
                    className="btn-primary w-full py-3.5 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                    {isLoading ? '正在分析…' : '开始测试'}
                  </button>
                </div>

                {/* 预设场景 */}
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'oklch(0.4 0.008 65)' }}>
                    常见纠结
                  </p>
                  <div className="flex flex-col gap-2">
                    {PRESET_DILEMMAS.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => handlePreset(d)}
                        className="text-left px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150"
                        style={{
                          background: 'oklch(0.12 0.006 285)',
                          border: '1px solid oklch(0.18 0.006 285)',
                          color: 'oklch(0.62 0.008 65)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232, 168, 76, 0.3)';
                          (e.currentTarget as HTMLButtonElement).style.color = '#F0EDE8';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'oklch(0.18 0.006 285)';
                          (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.62 0.008 65)';
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-center" style={{ color: 'oklch(0.65 0.2 27)' }}>
                    {error}
                  </p>
                )}
              </motion.div>
            )}

            {/* === 补充信息阶段 === */}
            {status === 'need_info' && (
              <motion.div
                key="need_info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <p className="text-xs tracking-widest uppercase" style={{ color: '#E8A84C' }}>
                    需要了解更多
                  </p>
                  <h2
                    className="text-lg font-medium leading-relaxed"
                    style={{ fontFamily: "'Noto Serif SC', serif", color: '#F0EDE8' }}
                  >
                    <TypewriterText text={clarifyQuestion} speed={35} />
                  </h2>
                </div>

                <div className="thin-divider" />

                <div className="flex flex-col gap-3">
                  <textarea
                    value={clarifyValue}
                    onChange={e => setClarifyValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitClarify();
                      }
                    }}
                    placeholder="补充一下…"
                    rows={3}
                    className="w-full resize-none rounded-xl px-4 py-3.5 text-sm leading-relaxed outline-none transition-all duration-200"
                    style={{
                      background: 'oklch(0.12 0.006 285)',
                      border: '1px solid oklch(0.22 0.006 285)',
                      color: '#F0EDE8',
                      caretColor: '#E8A84C',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(232, 168, 76, 0.5)'; }}
                    onBlur={e => { e.target.style.borderColor = 'oklch(0.22 0.006 285)'; }}
                    autoFocus
                  />
                  <button
                    onClick={handleSubmitClarify}
                    disabled={!clarifyValue.trim() || isLoading}
                    className="btn-primary w-full py-3.5 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '正在分析…' : '继续'}
                  </button>
                </div>

                {isLoading && <LoadingDots />}
                {error && (
                  <p className="text-xs text-center" style={{ color: 'oklch(0.65 0.2 27)' }}>
                    {error}
                  </p>
                )}
              </motion.div>
            )}

            {/* === 动态问卷阶段 === */}
            {status === 'questioning' && (
              <motion.div
                key={`questioning-${questionCount}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-6"
              >
                {/* 进度 */}
                <div className="flex flex-col gap-3">
                  <ProgressDots total={5} current={questionCount - 1} />
                  <p className="text-center text-xs" style={{ color: 'oklch(0.4 0.008 65)' }}>
                    正在深入分析
                  </p>
                </div>

                <div className="thin-divider" />

                {/* 问题 */}
                {currentQuestion && questionVisible && (
                  <div className="flex flex-col gap-6">
                    <h2
                      className="text-lg font-medium leading-relaxed"
                      style={{ fontFamily: "'Noto Serif SC', serif", color: '#F0EDE8' }}
                    >
                      <TypewriterText text={currentQuestion.question} speed={35} />
                    </h2>

                    {/* 五级程度选择器 */}
                    <ScaleSelector
                      optionA={currentQuestion.option_a}
                      optionB={currentQuestion.option_b}
                      selected={selectedOption}
                      onSelect={handleSelectOption}
                      disabled={isLoading || selectedOption !== null}
                    />
                  </div>
                )}

                {/* 加载中 */}
                {(isLoading || !questionVisible) && !selectedOption && (
                  <LoadingDots text="正在生成下一个问题…" />
                )}

                {/* 选中后等待 */}
                {selectedOption && isLoading && (
                  <LoadingDots text="正在分析你的选择…" />
                )}

                {error && (
                  <p className="text-xs text-center" style={{ color: 'oklch(0.65 0.2 27)' }}>
                    {error}
                  </p>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* 底部 */}
        <footer className="container py-4 text-center">
          <p className="text-xs" style={{ color: 'oklch(0.3 0.005 65)' }}>
            点醒不替你做决定，只帮你照见自己
          </p>
        </footer>
      </div>
    </div>
  );
}
