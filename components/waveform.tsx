"use client";

import { useEffect, useRef } from "react";

export function Waveform({
  analyser,
  active,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const bars = 36;
      const gap = 5;
      const barWidth = (width - gap * (bars - 1)) / bars;
      const values = new Array<number>(bars).fill(active ? 0.08 : 0.05);
      if (analyser && active) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / bars));
        for (let index = 0; index < bars; index += 1) {
          values[index] = Math.max(0.06, (data[index * step] ?? 0) / 255);
        }
      }
      values.forEach((value, index) => {
        const barHeight = Math.max(4, value * (height - 6));
        const x = index * (barWidth + gap);
        const y = (height - barHeight) / 2;
        context.fillStyle = active ? "oklch(0.45 0.08 168)" : "oklch(0.78 0.02 80)";
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, 99);
        context.fill();
      });
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [active, analyser]);

  return <canvas ref={ref} className="h-16 w-full" aria-hidden="true" />;
}
