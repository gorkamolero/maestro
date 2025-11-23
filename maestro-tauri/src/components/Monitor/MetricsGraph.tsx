import { useState, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { metricsStore } from '@/stores/metrics.store';
import { cn } from '@/lib/utils';

interface MetricsGraphProps {
  type: 'cpu' | 'ram';
  maxDataPoints?: number;
  height?: number;
  className?: string;
}

interface DataPoint {
  timestamp: number;
  value: number;
}

export function MetricsGraph({
  type,
  maxDataPoints = 60,
  height = 40,
  className,
}: MetricsGraphProps) {
  const { systemMetrics } = useSnapshot(metricsStore);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!systemMetrics) return;

    const value =
      type === 'cpu'
        ? systemMetrics.total_cpu
        : (systemMetrics.used_ram / systemMetrics.total_ram) * 100;

    setDataPoints((prev) => {
      const newPoints = [
        ...prev,
        {
          timestamp: Date.now(),
          value,
        },
      ];

      // Keep only the last N data points
      if (newPoints.length > maxDataPoints) {
        return newPoints.slice(newPoints.length - maxDataPoints);
      }

      return newPoints;
    });
  }, [systemMetrics, type, maxDataPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw the graph
    const xStep = width / (maxDataPoints - 1);
    const maxValue = 100;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (type === 'cpu') {
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // blue
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    } else {
      gradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)'); // purple
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)');
    }

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(0, height);

    dataPoints.forEach((point, index) => {
      const x = index * xStep;
      const y = height - (point.value / maxValue) * height;
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo((dataPoints.length - 1) * xStep, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    dataPoints.forEach((point, index) => {
      const x = index * xStep;
      const y = height - (point.value / maxValue) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = type === 'cpu' ? 'rgba(59, 130, 246, 1)' : 'rgba(168, 85, 247, 1)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [dataPoints, maxDataPoints, type]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={height}
      className={cn('w-full', className)}
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
