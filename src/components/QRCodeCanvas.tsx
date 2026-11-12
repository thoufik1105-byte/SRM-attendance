import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  includeLogo?: boolean;
  className?: string;
  dotColor?: string;
}

export const QRCodeCanvas: React.FC<QRCodeCanvasProps> = ({
  value,
  size = 220,
  includeLogo = true,
  className = '',
  dotColor = '#000000'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    QRCode.toCanvas(
      canvas,
      value,
      {
        width: size,
        margin: 2,
        color: {
          dark: dotColor,
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H' // High error correction allows center crest overlay
      },
      (error) => {
        if (error) {
          console.error('QR Code render error:', error);
          return;
        }

        if (includeLogo) {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Draw university crest badge in center
          const logoSize = Math.floor(size * 0.24);
          const center = size / 2;
          const x = center - logoSize / 2;
          const y = center - logoSize / 2;

          // White circular background for crest
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(center, center, (logoSize / 2) + 4, 0, Math.PI * 2);
          ctx.fill();

          // Border ring (Navy blue)
          ctx.strokeStyle = '#1e3a8a';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Inner emblem background (Navy blue)
          ctx.fillStyle = '#1e3a8a';
          ctx.beginPath();
          ctx.arc(center, center, (logoSize / 2) - 1, 0, Math.PI * 2);
          ctx.fill();

          // Draw university crest icon / monogram
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.floor(logoSize * 0.38)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('MUT', center, center - 1);

          ctx.font = `bold ${Math.floor(logoSize * 0.16)}px sans-serif`;
          ctx.fillStyle = '#93c5fd';
          ctx.fillText('1984', center, center + Math.floor(logoSize * 0.26));

          ctx.restore();
        }
      }
    );
  }, [value, size, includeLogo, dotColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-lg shadow-inner ${className}`}
      aria-label="Attendance QR Code"
    />
  );
};
