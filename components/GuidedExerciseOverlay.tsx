"use client";
import { useEffect, useRef, useState } from "react";
import { deriveGuideState, getGuideFor } from "@/lib/guidedExercise";

interface GuidedExerciseOverlayProps {
  /** 训练名称，如"踝泵运动" */
  name: string;
  /** 本组目标次数（来自计划项 targetValue），null 表示不限目标 */
  target: number | null;
  /** 开始本组训练前已完成的次数（组内进度，用于累计展示） */
  baseCount: number;
  /** 进度徽标前缀；单组动作是"今日"，多组动作是"第 N 组" */
  setLabel?: string;
  /** 训练结束回调：reps 为本次自动计出的完成次数（0 表示没练，直接关闭） */
  onFinish: (reps: number) => void;
}

/**
 * 引导式训练浮层：准备倒计时(5s) → 按动作定制的口令循环 + 自动计数。
 * 节拍完全由 lib/guidedExercise.ts 的纯函数推导，组件只负责喂累计时间。
 */
export function GuidedExerciseOverlay({
  name,
  target,
  baseCount,
  setLabel = "今日",
  onFinish,
}: GuidedExerciseOverlayProps) {
  const guide = getGuideFor(name);
  /** 距离达成今日目标还差几次（无目标时为 null） */
  const needed = target == null ? null : Math.max(target - baseCount, 0);

  const [running, setRunning] = useState(true);
  const [goalReached, setGoalReached] = useState(false);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const [, setTick] = useState(0);

  // 100ms 心跳累计训练时长；暂停/达标时停表
  useEffect(() => {
    if (!running) {
      lastTickRef.current = null;
      return;
    }
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      if (lastTickRef.current != null) {
        elapsedRef.current += now - lastTickRef.current;
      }
      lastTickRef.current = now;
      setTick((v) => v + 1);
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const state = deriveGuideState(elapsedRef.current, guide);

  // 达成目标自动停表庆祝
  useEffect(() => {
    if (
      running &&
      needed != null &&
      needed > 0 &&
      state.reps >= needed
    ) {
      setRunning(false);
      setGoalReached(true);
    }
  }, [running, needed, state.reps]);

  const tense = state.emph && running && !goalReached;
  /** 口令大字：准备阶段用沙漏，用力阶段蓝色，放松阶段绿色 */
  const cueText = `${state.cue} ${state.ready ? "⏳" : state.emph ? "🔵" : "🟢"}`;
  const seconds = Math.ceil(state.remainingMs / 1000);
  const done = baseCount + state.reps;
  /** 底部说明：把完整节拍念一遍，如"准备 5 秒 → 勾脚尖 5 秒 → 绷脚尖 5 秒" */
  const tempoText = [
    ...(guide.readyMs > 0 ? [`准备 ${guide.readyMs / 1000} 秒`] : []),
    ...guide.phases.map((p) => `${p.cue} ${p.ms / 1000} 秒`),
  ].join(" → ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} 引导训练`}
    >
      <div className="w-[min(92vw,380px)] rounded-3xl bg-white p-6 shadow-xl animate-pop-in">
        {/* 头部：动作名 + 进度（单组看今日、多组看本组） */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-fun text-lg font-bold">{name}</h3>
          {target != null && (
            <span
              role="status"
              className="text-xs bg-peach text-ragdoll px-2 py-1 rounded-full whitespace-nowrap"
            >
              {setLabel} {done} / {target} 次
            </span>
          )}
        </div>

        {/* 达标庆祝 / 引导主体 */}
        {goalReached ? (
          <div className="py-10 text-center animate-pop-in">
            <div className="text-5xl" aria-hidden="true">
              🎉
            </div>
            <p className="mt-3 font-bold text-base">
              目标达成！{setLabel}已完成 {done} 次
            </p>
            <p className="mt-1 text-xs opacity-60">
              本次跟着节奏练了 {state.reps} 次，太棒了～
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center">
            {/* 倒计时秒数：纯大字，颜色随阶段切换（用力珊瑚 / 放松可可） */}
            <div
              key={state.cue}
              className={`mt-2 font-fun text-7xl font-bold leading-none tabular-nums animate-pop-in ${
                tense ? "text-coral" : "text-cocoa"
              }`}
            >
              {seconds}
              <span className="ml-1 text-2xl opacity-60">秒</span>
            </div>

            {/* 大字口令：准备阶段固定是"准备"，之后是各动作自己的口令 */}
            <div
              className={`mt-3 px-8 py-2 rounded-2xl font-fun text-3xl font-bold ${
                tense ? "bg-coral/15 text-coral" : "bg-mint/30 text-cocoa"
              }`}
            >
              {cueText}
            </div>
            <p className="mt-1.5 text-xs opacity-55">{state.hint}</p>

            {/* 计数：走完一整个口令循环自动 +1 */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm opacity-60">第</span>
              <span
                key={state.reps}
                role="status"
                aria-label={`已完成 ${state.reps} 次`}
                className="text-4xl font-fun font-bold text-ragdoll animate-pop-in tabular-nums min-w-12 text-center"
              >
                {state.reps + 1}
              </span>
              <span className="text-sm opacity-60">次 · 已完成 {state.reps} 次</span>
            </div>
          </div>
        )}

        {/* 控制区 */}
        <div className="mt-5 flex gap-3">
          {!goalReached && (
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="flex-1 py-3 rounded-2xl border-2 border-ragdoll/30 text-ragdoll font-bold active:scale-95 transition-all"
            >
              {running ? "⏸ 暂停" : "▶ 继续"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onFinish(state.reps)}
            className={`flex-1 py-3 rounded-2xl border-2 font-bold active:scale-95 transition-all ${
              goalReached
                ? "border-mint bg-mint/40 text-cocoa"
                : "border-peach bg-peach text-ragdoll"
            }`}
          >
            {state.reps > 0 ? "✔ 结束并记录" : "✕ 关闭"}
          </button>
        </div>
        {!goalReached && running && (
          <p className="mt-2.5 text-center text-[11px] opacity-45">
            跟着口令做：{tempoText}，系统自动计数
          </p>
        )}
      </div>
    </div>
  );
}
