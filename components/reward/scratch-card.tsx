"use client";

import React, { useRef, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Sparkles, CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScratchCardProps {
  rewardLabel: string;
  couponCode: string;
  onScratched?: () => void;
}

export function ScratchCard({
  rewardLabel,
  couponCode,
  onScratched,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const width = 320;
    const height = 180;
    canvas.width = width;
    canvas.height = height;

    // Draw silver/golden glitter scratch layer
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#d1d5db");
    gradient.addColorStop(0.3, "#f3f4f6");
    gradient.addColorStop(0.5, "#9ca3af");
    gradient.addColorStop(0.8, "#e5e7eb");
    gradient.addColorStop(1, "#9ca3af");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw scratch instructions
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.textAlign = "center";
    ctx.fillText("✨ SCRATCH HERE WITH FINGER ✨", width / 2, height / 2 - 8);

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("To reveal your secret surprise reward!", width / 2, height / 2 + 16);
  }, []);

  const triggerCelebration = () => {
    if (isRevealed) return;
    setIsRevealed(true);

    // Fire Confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    if (onScratched) onScratched();
  };

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    checkScratchProgress();
  };

  const checkScratchProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sample pixels to measure transparent percentage
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    let transparentCount = 0;
    const totalSampled = pixels.length / 16; // Sample every 4th pixel for speed

    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) transparentCount++;
    }

    const percent = (transparentCount / totalSampled) * 100;
    if (percent > 40) {
      // Auto-clear canvas and trigger win!
      ctx.clearRect(0, 0, width, height);
      triggerCelebration();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDrawing.current = true;
    const { x, y } = getPos(e.nativeEvent);
    scratch(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const { x, y } = getPos(e.nativeEvent);
    scratch(x, y);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDrawing.current = true;
    const { x, y } = getPos(e.nativeEvent);
    scratch(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing.current) return;
    const { x, y } = getPos(e.nativeEvent);
    scratch(x, y);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Scratch Box */}
      <div
        ref={containerRef}
        className="relative w-80 h-44 rounded-3xl overflow-hidden shadow-soft-lg border-4 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center text-center p-4 select-none touch-none"
      >
        {/* Underlying Winning Reward */}
        <div className="space-y-2 z-0">
          <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
            <Sparkles className="w-3 h-3" /> CONGRATULATIONS!
          </div>
          <h3 className="text-xl font-black text-brand-900 leading-snug">
            {rewardLabel}
          </h3>
          <div className="inline-block px-3 py-1 bg-white rounded-xl border border-amber-300 font-mono font-black text-sm text-stone-900 tracking-wider shadow-xs">
            {couponCode}
          </div>
        </div>

        {/* Scratchable Top Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className={`absolute inset-0 cursor-pointer transition-opacity duration-300 ${
            isRevealed ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        />
      </div>

      {/* Copy Code & Celebration Banner */}
      {isRevealed && (
        <div className="text-center space-y-2 animate-in zoom-in-95 duration-200">
          <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Reward unlocked and ready to use!
          </p>

          <Button
            size="sm"
            variant="outline"
            onClick={copyCode}
            className="bg-white border-amber-300 text-stone-800 font-bold text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copied {couponCode}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy Coupon Code
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
