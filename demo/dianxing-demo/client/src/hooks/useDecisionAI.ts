/**
 * 点醒 · AI决策辅助核心Hook
 * 设计哲学：深夜诊室 — 克制、深邃、直击内心
 *
 * 状态机：
 *   idle → need_info → questioning → finished
 *
 * LLM调用已移至后端tRPC接口，前端不再持有API Key
 */

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

// ==================== 类型定义 ====================

export type AppStatus = 'idle' | 'need_info' | 'questioning' | 'finished';

export interface QuestionData {
  question: string;
  option_a: string;
  option_b: string;
  strategy: string;
  reasoning?: string;
}

export interface ReportData {
  awakening_quote: string;
  analysis: string;
  tendency: string;
  action_advice: string;
}

export interface AIResponse {
  status: AppStatus;
  clarify_question?: string;
  question?: QuestionData;
  report?: ReportData;
}

export type ChoiceLevel = 'A' | '偏A' | '中间' | '偏B' | 'B';

export interface AnswerRecord {
  question: string;
  option_a: string;
  option_b: string;
  chosen: ChoiceLevel;
  chosen_text: string;
  strategy: string;
}

// ==================== Hook ====================

export function useDecisionAI() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [clarifyQuestion, setClarifyQuestion] = useState<string>('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [dilemma, setDilemma] = useState<string>('');
  const [clarifyQ, setClarifyQ] = useState<string | undefined>(undefined);
  const [clarifyA, setClarifyA] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const chatMutation = trpc.decision.chat.useMutation();
  const saveHistoryMutation = trpc.history.save.useMutation();

  // 保存历史记录（静默失败，不影响主流程）
  const saveHistory = useCallback(async (
    dilemma: string,
    clarifyQ: string | undefined,
    clarifyA: string | undefined,
    answersData: AnswerRecord[],
    reportData: ReportData
  ) => {
    try {
      await saveHistoryMutation.mutateAsync({
        dilemma,
        clarifyQuestion: clarifyQ,
        clarifyAnswer: clarifyA,
        answers: answersData,
        awakeningQuote: reportData.awakening_quote,
        analysis: reportData.analysis,
        tendency: reportData.tendency,
        actionAdvice: reportData.action_advice,
      });
    } catch (err) {
      console.warn('[History] Failed to save session:', err);
    }
  }, [saveHistoryMutation]);

  // 调用后端tRPC接口
  const callAI = useCallback(async (newMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await chatMutation.mutateAsync({ messages: newMessages });
      return result as AIResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误，请重试';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [chatMutation]);

  // 用户提交初始纠结描述
  const submitDilemma = useCallback(async (dilemmaText: string) => {
    setDilemma(dilemmaText);
    const newMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'user', content: `我现在有个纠结想请你帮我分析：${dilemmaText}` }
    ];
    setMessages(newMessages);

    const result = await callAI(newMessages);
    if (!result) return;

    const updatedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      ...newMessages,
      { role: 'assistant', content: JSON.stringify(result) }
    ];
    setMessages(updatedMessages);

    if (result.status === 'need_info' && result.clarify_question) {
      setClarifyQuestion(result.clarify_question);
      setClarifyQ(result.clarify_question);
      setStatus('need_info');
    } else if (result.status === 'questioning' && result.question) {
      setCurrentQuestion(result.question);
      setQuestionCount(1);
      setStatus('questioning');
    } else if (result.status === 'finished' && result.report) {
      setReport(result.report);
      setStatus('finished');
      saveHistory(dilemmaText, undefined, undefined, [], result.report);
    }
  }, [callAI, saveHistory]);

  // 用户补充信息
  const submitClarification = useCallback(async (clarification: string) => {
    setClarifyA(clarification);
    const newMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      ...messages,
      { role: 'user', content: clarification }
    ];
    setMessages(newMessages);

    const result = await callAI(newMessages);
    if (!result) return;

    const updatedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      ...newMessages,
      { role: 'assistant', content: JSON.stringify(result) }
    ];
    setMessages(updatedMessages);

    if (result.status === 'questioning' && result.question) {
      setCurrentQuestion(result.question);
      setQuestionCount(1);
      setStatus('questioning');
    } else if (result.status === 'finished' && result.report) {
      setReport(result.report);
      setStatus('finished');
      saveHistory(dilemma, clarifyQ, clarification, [], result.report);
    }
  }, [messages, callAI, dilemma, clarifyQ, saveHistory]);

  // 用户选择选项
  const submitAnswer = useCallback(async (choice: ChoiceLevel) => {
    if (!currentQuestion) return;

    // 根据五级选择生成描述文本
    const chosenText = (() => {
      if (choice === 'A') return currentQuestion.option_a;
      if (choice === 'B') return currentQuestion.option_b;
      if (choice === '偏A') return `更倾向于：${currentQuestion.option_a}`;
      if (choice === '偏B') return `更倾向于：${currentQuestion.option_b}`;
      return `两边都有共鸣：${currentQuestion.option_a} / ${currentQuestion.option_b}`;
    })();

    const answerRecord: AnswerRecord = {
      question: currentQuestion.question,
      option_a: currentQuestion.option_a,
      option_b: currentQuestion.option_b,
      chosen: choice,
      chosen_text: chosenText,
      strategy: currentQuestion.strategy,
    };

    const newAnswers = [...answers, answerRecord];
    setAnswers(newAnswers);

    // 向LLM传递带程度信息的选择描述
    const userContent = (() => {
      if (choice === 'A') return `我选A（完全认同）：${currentQuestion.option_a}`;
      if (choice === 'B') return `我选B（完全认同）：${currentQuestion.option_b}`;
      if (choice === '偏A') return `我偏A（但不完全确定）：${currentQuestion.option_a}`;
      if (choice === '偏B') return `我偏B（但不完全确定）：${currentQuestion.option_b}`;
      return `我选中间（两边都有共鸣，难以明确偏向）：A是“${currentQuestion.option_a}”，B是“${currentQuestion.option_b}”`;
    })();
    const newMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      ...messages,
      { role: 'user', content: userContent }
    ];
    setMessages(newMessages);

    const result = await callAI(newMessages);
    if (!result) return;

    const updatedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      ...newMessages,
      { role: 'assistant', content: JSON.stringify(result) }
    ];
    setMessages(updatedMessages);

    if (result.status === 'questioning' && result.question) {
      setCurrentQuestion(result.question);
      setQuestionCount(prev => prev + 1);
    } else if (result.status === 'finished' && result.report) {
      setReport(result.report);
      setStatus('finished');
      // 异步保存历史记录（不阻塞UI）
      saveHistory(dilemma, clarifyQ, clarifyA, newAnswers, result.report);
    }
  }, [currentQuestion, answers, messages, callAI, dilemma, clarifyQ, clarifyA, saveHistory]);

  // 重置
  const reset = useCallback(() => {
    setStatus('idle');
    setMessages([]);
    setCurrentQuestion(null);
    setClarifyQuestion('');
    setReport(null);
    setAnswers([]);
    setQuestionCount(0);
    setDilemma('');
    setClarifyQ(undefined);
    setClarifyA(undefined);
    setError('');
  }, []);

  return {
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
  };
}
