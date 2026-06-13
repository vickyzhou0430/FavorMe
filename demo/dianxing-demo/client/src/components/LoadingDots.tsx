/**
 * 加载动画组件 — 三个琥珀色脉冲点
 */

export function LoadingDots({ text = '正在深入你的潜意识' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full loading-dot"
            style={{
              background: '#E8A84C',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground font-light tracking-wide">{text}</p>
    </div>
  );
}
