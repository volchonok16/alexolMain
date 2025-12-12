import { useEffect, useRef, memo } from "react";

interface InteractiveGridProps {
  mousePos: { x: number; y: number };
}

export const InteractiveGrid = memo(({ mousePos }: InteractiveGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const gridSize = 80;
    const glowRadius = 150;
    const glowRadiusSq = glowRadius * glowRadius;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const startX = Math.max(0, Math.floor((mousePos.x - glowRadius) / gridSize) * gridSize);
      const endX = Math.min(canvas.width, Math.ceil((mousePos.x + glowRadius) / gridSize) * gridSize);
      const startY = Math.max(0, Math.floor((mousePos.y - glowRadius) / gridSize) * gridSize);
      const endY = Math.min(canvas.height, Math.ceil((mousePos.y + glowRadius) / gridSize) * gridSize);

      for (let x = 0; x <= canvas.width; x += gridSize) {
        for (let y = 0; y <= canvas.height; y += gridSize) {
          const inGlowArea = x >= startX && x <= endX && y >= startY && y <= endY;
          
          let intensity = 0;
          if (inGlowArea) {
            const dx = mousePos.x - x;
            const dy = mousePos.y - y;
            const distanceSq = dx * dx + dy * dy;
            
            if (distanceSq < glowRadiusSq) {
              intensity = Math.max(0, 1 - Math.sqrt(distanceSq) / glowRadius);
            }
          }
          
          const opacity = 0.08 + intensity * 0.3;
          const lineWidth = 1 + intensity * 2;

          ctx.strokeStyle = `rgba(10, 227, 255, ${opacity})`;
          ctx.lineWidth = lineWidth;

          if (x < canvas.width) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + gridSize, y);
            ctx.stroke();
          }

          if (y < canvas.height) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + gridSize);
            ctx.stroke();
          }

          if (intensity > 0.3) {
            ctx.fillStyle = `rgba(10, 227, 255, ${intensity * 0.5})`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mousePos]);

  return (
    <canvas
      ref={canvasRef}
      className="hero__interactive-grid"
    />
  );
});
