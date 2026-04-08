/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { motion, AnimatePresence } from 'motion/react';
import { Camera as CameraIcon, Hand, Sparkles, Eraser } from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
}

// --- Constants ---
const COLORS = [
  '#00ffff', // 1: Cyan
  '#ff00ff', // 2: Magenta
  '#ffff00', // 3: Yellow
];

const GESTURE_DELAY = 1500; // 1.5 seconds
const SESSION_DURATION = 60; // 60 seconds
const FINAL_VIEW_DURATION = 20; // 20 seconds total (10s cuts + 10s frame)

// --- Components ---

const PaintingFrame = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative p-8 md:p-12 lg:p-16 bg-[#1a1a1a] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[12px] border-[#2a2a2a] rounded-sm">
      {/* Inner Ornate Border */}
      <div className="absolute inset-0 border-[4px] border-[#3a3a3a] m-1 pointer-events-none" />
      <div className="absolute inset-0 border border-white/5 m-4 pointer-events-none" />
      
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/20 m-2" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/20 m-2" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/20 m-2" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/20 m-2" />
      
      <div className="relative bg-black overflow-hidden aspect-[4/3] w-full max-w-[80vw] max-h-[70vh] shadow-inner">
        {children}
      </div>
      
      {/* Label */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#222] border border-white/10 text-[10px] uppercase tracking-[0.3em] text-white/60 font-bold">
        Celestial Void № 1
      </div>
    </div>
  );
};

const CinematicReveal = ({ particles, onComplete }: { particles: Particle[], onComplete: () => void }) => {
  const [phase, setPhase] = useState(0); // 0, 1, 2 for cut shots, 3 for full reveal
  const [focusPoints, setFocusPoints] = useState<{x: string, y: string}[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finalCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Calculate focus points based on particle density
    if (particles.length > 0) {
      const points = [];
      // Simple density check: split canvas into 3x3 grid
      const grid: { [key: string]: number } = {};
      particles.forEach(p => {
        const gx = Math.floor((p.x / window.innerWidth) * 3);
        const gy = Math.floor((p.y / window.innerHeight) * 3);
        const key = `${gx},${gy}`;
        grid[key] = (grid[key] || 0) + 1;
      });

      const sortedGrid = Object.entries(grid).sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < 3; i++) {
        if (sortedGrid[i]) {
          const [gx, gy] = sortedGrid[i][0].split(',').map(Number);
          points.push({
            x: `${(gx * 33 + 16) - 50}%`,
            y: `${(gy * 33 + 16) - 50}%`
          });
        } else {
          points.push({ x: '0%', y: '0%' });
        }
      }
      setFocusPoints(points);
    } else {
      setFocusPoints([{x: '0%', y: '0%'}, {x: '0%', y: '0%'}, {x: '0%', y: '0%'}]);
    }

    const timers = [
      setTimeout(() => setPhase(1), 3000),
      setTimeout(() => setPhase(2), 6000),
      setTimeout(() => setPhase(3), 10000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [particles]);

  const draw = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
      const y = (Math.cos(i * 678.90) * 0.5 + 0.5) * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    const time = Date.now() / 1000;
    particles.forEach(p => {
      // Breathing effect
      const breathe = Math.sin(time * 2 + p.x) * 0.2 + 1;
      const glow = Math.sin(time * 1.5 + p.y) * 0.3 + 0.7;

      ctx.shadowBlur = 15 * breathe;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity * glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * breathe, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  useEffect(() => {
    let animationFrameId: number;
    const render = () => {
      if (phase < 3) {
        draw(canvasRef.current);
      } else {
        draw(finalCanvasRef.current);
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [particles, phase]);

  const getTransform = () => {
    if (focusPoints.length === 0) return { scale: 1, x: "0%", y: "0%" };
    switch(phase) {
      case 0: return { scale: 2.5, x: focusPoints[0].x, y: focusPoints[0].y };
      case 1: return { scale: 2.5, x: focusPoints[1].x, y: focusPoints[1].y };
      case 2: return { scale: 3, x: focusPoints[2].x, y: focusPoints[2].y };
      case 3: return { scale: 1, x: "0%", y: "0%" };
      default: return { scale: 1, x: "0%", y: "0%" };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {phase < 3 ? (
          <motion.div
            key="cut-shots"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full"
          >
            <motion.div
              animate={getTransform()}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="w-full h-full"
            >
              <canvas 
                ref={canvasRef} 
                width={window.innerWidth} 
                height={window.innerHeight}
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            {/* Cinematic Overlays */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent" />
              <div className="absolute top-1/2 left-8 -translate-y-1/2 w-px h-32 bg-white/20" />
              <div className="absolute top-1/2 right-8 -translate-y-1/2 w-px h-32 bg-white/20" />
            </div>

            <motion.div 
              key={`label-${phase}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute bottom-12 left-12 text-white/40 font-mono text-xs tracking-[0.5em] uppercase"
            >
              Detail Scan 0{phase + 1} // Processing...
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="final-reveal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <PaintingFrame>
              <canvas 
                ref={finalCanvasRef} 
                width={window.innerWidth} 
                height={window.innerHeight}
                className="w-full h-full object-contain"
              />
            </PaintingFrame>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-20 flex flex-col items-center gap-4"
            >
              <h2 className="text-4xl font-black uppercase tracking-[0.5em] text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                Masterpiece
              </h2>
              <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase">
                Captured in the Celestial Void
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Helper for finger counting ---
const countFingers = (landmarks: any) => {
  let count = 0;
  
  // Thumb: Check distance from pinky base to tip vs IP joint
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const pinkyBase = landmarks[17];
  const distTip = Math.sqrt(Math.pow(thumbTip.x - pinkyBase.x, 2) + Math.pow(thumbTip.y - pinkyBase.y, 2));
  const distIP = Math.sqrt(Math.pow(thumbIP.x - pinkyBase.x, 2) + Math.pow(thumbIP.y - pinkyBase.y, 2));
  if (distTip > distIP) count++;

  // Fingers: Tip Y < PIP Y (lower Y is higher in screen coordinates)
  if (landmarks[8].y < landmarks[6].y) count++;   // Index
  if (landmarks[12].y < landmarks[10].y) count++; // Middle
  if (landmarks[16].y < landmarks[14].y) count++; // Ring
  if (landmarks[20].y < landmarks[18].y) count++; // Pinky

  return count;
};

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentHandPos, setCurrentHandPos] = useState<{ x: number, y: number } | null>(null);
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Session Timer State
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isShowingFinal, setIsShowingFinal] = useState(false);

  // Gesture State
  const [detectedFingers, setDetectedFingers] = useState<number>(0);
  const [pendingGesture, setPendingGesture] = useState<number | null>(null);
  const [gestureProgress, setGestureProgress] = useState(0);
  const gestureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastGestureRef = useRef<number>(0);

  // Refs for stable access in MediaPipe callbacks
  const latestState = useRef({ isSessionActive, isShowingFinal, currentColor, particles });
  useEffect(() => {
    latestState.current = { isSessionActive, isShowingFinal, currentColor, particles };
  }, [isSessionActive, isShowingFinal, currentColor, particles]);

  const clearCanvas = useCallback(() => {
    setParticles([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // 2D Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear with slight fade for trail effect if we wanted, 
      // but here we manage particles in state for "celestial" persistence
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stars background (static-ish)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = 0; i < 100; i++) {
        const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(i * 678.90) * 0.5 + 0.5) * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw particles
      const time = Date.now() / 1000;
      latestState.current.particles.forEach(p => {
        // Breathing effect
        const breathe = Math.sin(time * 2 + p.x) * 0.2 + 1;
        const glow = Math.sin(time * 1.5 + p.y) * 0.3 + 0.7;

        ctx.shadowBlur = 15 * breathe;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * breathe, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Cursor
      if (currentHandPos && !isShowingFinal) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentColor;
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(currentHandPos.x, currentHandPos.y, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(currentHandPos.x, currentHandPos.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentHandPos, isShowingFinal, currentColor]);

  // MediaPipe Hands setup
  useEffect(() => {
    if (!videoRef.current) return;

    let active = true;
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results: Results) => {
      if (!active) return;
      
      const { 
        isSessionActive: currentIsSessionActive, 
        isShowingFinal: currentIsShowingFinal, 
        currentColor: currentColorValue 
      } = latestState.current;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (!currentIsSessionActive && !currentIsShowingFinal) {
          setIsSessionActive(true);
        }

        if (currentIsShowingFinal) return;

        // Determine which hand is which
        const handData = results.multiHandLandmarks.map((lm, index) => ({
          landmarks: lm,
          label: results.multiHandedness[index].label // 'Left' or 'Right'
        }));

        // Left hand (or first hand if only one) for drawing/gestures
        // Right hand for erasing
        const leftHand = handData.find(h => h.label === 'Left') || handData[0];
        const rightHand = handData.find(h => h.label === 'Right');

        const landmarks = leftHand.landmarks;
        const fingerCount = countFingers(landmarks);
        setDetectedFingers(fingerCount);

        // Erase logic with Right Hand (Open Palm)
        if (rightHand && rightHand !== leftHand) {
          const rightFingerCount = countFingers(rightHand.landmarks);
          if (rightFingerCount >= 4) {
            setParticles([]);
          }
        }

        // Gesture Timer Logic for Color Selection
        if (fingerCount > 0 && fingerCount <= 3) {
          if (fingerCount !== lastGestureRef.current) {
            lastGestureRef.current = fingerCount;
            setPendingGesture(fingerCount);
            setGestureProgress(0);
            
            if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
            
            const startTime = Date.now();
            const interval = setInterval(() => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / GESTURE_DELAY, 1);
              setGestureProgress(progress);
              if (progress >= 1) clearInterval(interval);
            }, 50);
  
            gestureTimerRef.current = setTimeout(() => {
              clearInterval(interval);
              if (fingerCount >= 1 && fingerCount <= 3) {
                setCurrentColor(COLORS[fingerCount - 1]);
              }
              setPendingGesture(null);
              setGestureProgress(0);
            }, GESTURE_DELAY);
          }
        } else {
          lastGestureRef.current = 0;
          setPendingGesture(null);
          setGestureProgress(0);
          if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
        }

        // 2D Mapping
        const indexTip = landmarks[8];
        const canvas = canvasRef.current;
        if (canvas) {
          // Mirror X because camera is mirrored
          const x = (1 - indexTip.x) * canvas.width;
          const y = indexTip.y * canvas.height;

          if (fingerCount > 0) {
            setCurrentHandPos({ x, y });
          } else {
            setCurrentHandPos(null);
          }

          // Open palm = at least 4 fingers extended
          const openPalm = fingerCount >= 4;
          setIsDrawing(openPalm);

          if (openPalm) {
            setParticles((prev) => {
              const last = prev[prev.length - 1];
              if (last) {
                const distToLast = Math.sqrt(Math.pow(x - last.x, 2) + Math.pow(y - last.y, 2));
                if (distToLast < 5) return prev;
              }

              const newParticle: Particle = {
                id: Math.random().toString(36).substr(2, 9),
                x,
                y,
                color: currentColorValue,
                size: 2 + Math.random() * 4,
                opacity: 0.8 + Math.random() * 0.2,
              };

              return [...prev, newParticle].slice(-2000);
            });
          }
        }
      } else {
        setCurrentHandPos(null);
        setIsDrawing(false);
        setDetectedFingers(0);
        setPendingGesture(null);
        setGestureProgress(0);
        lastGestureRef.current = 0;
        if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (active && videoRef.current) {
          try {
            await hands.send({ image: videoRef.current });
          } catch (e) {
            console.error("Hands send error:", e);
          }
        }
      },
      width: 1280,
      height: 720,
    });

    camera.start().then(() => {
      if (active) setCameraActive(true);
    });

    return () => {
      active = false;
      camera.stop();
      hands.close();
      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
    };
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && timeLeft > 0 && !isShowingFinal) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isShowingFinal) {
      setIsShowingFinal(true);
      setTimeout(() => {
        clearCanvas();
        setTimeLeft(SESSION_DURATION);
        setIsShowingFinal(false);
        setIsSessionActive(false);
      }, FINAL_VIEW_DURATION * 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, timeLeft, isShowingFinal, clearCanvas]);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans text-white">
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Session Timer UI */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-30">
        <div className={cn(
          "px-6 py-2 rounded-full border backdrop-blur-xl transition-all duration-500 flex items-center gap-3",
          timeLeft <= 10 ? "bg-red-500/20 border-red-500/50 scale-110" : "bg-black/40 border-white/10"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isSessionActive ? "bg-green-400 animate-pulse" : "bg-white/20"
          )} />
          <span className="text-xl font-mono font-bold tracking-tighter">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
        {!isSessionActive && !isShowingFinal && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 mt-2"
          >
            Show hand to start
          </motion.span>
        )}
      </div>

      {/* Final View Cinematic Reveal */}
      <AnimatePresence>
        {isShowingFinal && (
          <CinematicReveal 
            particles={particles} 
            onComplete={() => {}} 
          />
        )}
      </AnimatePresence>

      {/* Camera Feed Overlay */}
      <div className="absolute top-4 right-4 w-48 h-36 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden shadow-2xl z-20 group">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          autoPlay
          playsInline
          muted
        />
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <CameraIcon className="w-6 h-6 text-white/50 animate-pulse" />
          </div>
        )}
        
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-medium uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          Live Feed
        </div>
      </div>

      {/* UI Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-30">
        <div className="flex items-center gap-4 p-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3 px-4">
            {COLORS.map((color, index) => (
              <div key={color} className="relative">
                <button
                  onClick={() => setCurrentColor(color)}
                  className={cn(
                    "w-12 h-12 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 border-2 flex items-center justify-center text-sm font-bold",
                    (currentColor === color) ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "border-transparent"
                  )}
                  style={{ backgroundColor: color, color: index === 2 ? '#000' : '#fff' }}
                >
                  {index + 1}
                </button>
                {pendingGesture === index + 1 && (
                  <svg className="absolute -inset-1 w-14 h-14 -rotate-90 pointer-events-none">
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray={163.36}
                      strokeDashoffset={163.36 * (1 - gestureProgress)}
                      className="transition-all duration-100"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 pointer-events-none opacity-40">
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <Hand className="w-3 h-3" />
              <span>Right Palm: Paint</span>
           </div>
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <Eraser className="w-3 h-3" />
              <span>Left Palm: Erase</span>
           </div>
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              <span>Right 1-3 fingers: Color</span>
           </div>
        </div>
      </div>

      {/* Decorative Background Glow */}
      <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-magenta-500/5 blur-[120px] pointer-events-none" />
    </div>
  );
}
