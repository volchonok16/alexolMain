import { useEffect, useRef } from 'react';
import { useTheme } from '@/shared/contexts';
import { ICON_COLORS } from './palette';
import { registerIcon3D } from './runtime';
import type { Icon3DType } from './meshes';
import './Icon3D.scss';

interface Icon3DProps {
  type: Icon3DType;
  className?: string;
  spin?: boolean;
}

export const Icon3D = ({ type, className = '', spin = true }: Icon3DProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const handleRef = useRef<ReturnType<typeof registerIcon3D>>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = registerIcon3D(canvas, type, theme, { spin });
    handleRef.current = handle;
    return () => {
      handle?.dispose();
      handleRef.current = null;
    };
    // Theme updates go through the second effect so the mesh is not rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, spin]);

  useEffect(() => {
    handleRef.current?.setTheme(theme);
  }, [theme]);

  const colors = ICON_COLORS[type][theme];

  return (
    <div
      className={`icon3d ${className}`.trim()}
      style={{
        '--icon-primary': colors.primary,
        '--icon-accent': colors.accent,
      } as React.CSSProperties}
    >
      <canvas ref={canvasRef} className="icon3d__canvas" />
    </div>
  );
};

export type { Icon3DType };
