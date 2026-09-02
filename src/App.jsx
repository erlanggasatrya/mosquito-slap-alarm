import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  ShieldCheck,
  Clock,
  Zap,
  RotateCcw,
  Award,
  Flame,
  Crosshair,
  Sparkles,
  Bomb,
  Skull,
  AlertTriangle,
  BellRing,
  Target,
} from "lucide-react";
import { audio } from "./Audio";

const COMIC_WORDS = [
  "POW!",
  "SMACK!",
  "WHACK!",
  "SPLAT!",
  "BAM!",
  "CRACK!",
  "BULLSEYE!",
];
const BOMB_WORDS = [
  "BOOOOM!",
  "KABLAM!",
  "BACK 3!",
  "EXPLODED!",
  "NUUUUKE!",
];

const MOSQUITO_SIZE = 32;
const MOSQUITO_BASE_SPEED = 320;

// Area gerak selalu dihitung dari ukuran arena aktual, bukan dari ukuran HP
// tertentu. HUD diberi sedikit ruang supaya nyamuk tidak selalu tertutup status.
const getMosquitoFlightBounds = (arenaW, arenaH) => {
  const topPadding = Math.min(84, Math.max(60, arenaH * 0.11));
  const maxPositionX = Math.max(0, arenaW - MOSQUITO_SIZE);
  const maxPositionY = Math.max(0, arenaH - MOSQUITO_SIZE);
  const sideInset = Math.min(Math.max(24, arenaW * 0.16), maxPositionX / 2);
  const playableTop = Math.min(topPadding, maxPositionY);
  const verticalRange = Math.max(0, maxPositionY - playableTop);
  const verticalInset = Math.min(Math.max(24, arenaH * 0.1), verticalRange / 2);

  return {
    minX: sideInset,
    maxX: maxPositionX - sideInset,
    minY: playableTop + verticalInset,
    maxY: maxPositionY - verticalInset,
  };
};

// Komponen Jam Kartun Interaktif Playful
function PlayfulAnimatedClock({ timeString }) {
  const [hours, minutes, seconds] = timeString
    ? timeString.split(":").map(Number)
    : [0, 0, 0];
  const secDeg = (seconds || 0) * 6;
  const minDeg = (minutes || 0) * 6 + (seconds || 0) * 0.1;
  const hrDeg = (hours % 12 || 0) * 30 + (minutes || 0) * 0.5;

  return (
    <div className="flex flex-col items-center select-none anim-clock-tock">
      <div className="relative w-40 h-40 sm:w-48 sm:h-48 bg-yellow-300 border-4 sm:border-6 border-zinc-900 rounded-full comic-shadow-lg flex items-center justify-center p-2">
        {/* Telinga Bel Alarm */}
        <div className="absolute -top-3.5 -left-3.5 w-9 h-9 bg-red-500 border-3 border-zinc-900 rounded-full comic-shadow-sm flex items-center justify-center text-xs animate-bounce">
          🔔
        </div>
        <div className="absolute -top-3.5 -right-3.5 w-9 h-9 bg-red-500 border-3 border-zinc-900 rounded-full comic-shadow-sm flex items-center justify-center text-xs animate-bounce">
          🔔
        </div>

        {/* Wajah Jam */}
        <div className="relative w-full h-full bg-white border-3 border-zinc-900 rounded-full flex flex-col items-center justify-between p-2 overflow-hidden">
          <span className="text-[10px] font-black text-zinc-800">12</span>
          <div className="w-full flex justify-between px-1 text-[10px] font-black text-zinc-800">
            <span>9</span>
            <span>3</span>
          </div>
          <span className="text-[10px] font-black text-zinc-800">6</span>

          {/* Mata Melirik */}
          <div className="absolute top-6 flex gap-2.5">
            <div className="w-3.5 h-4.5 bg-white border-2 border-zinc-900 rounded-full relative overflow-hidden">
              <div
                className="w-2 h-2 bg-zinc-900 rounded-full absolute top-1 transition-all duration-300"
                style={{ left: seconds % 2 === 0 ? "1px" : "3px" }}
              />
            </div>
            <div className="w-3.5 h-4.5 bg-white border-2 border-zinc-900 rounded-full relative overflow-hidden">
              <div
                className="w-2 h-2 bg-zinc-900 rounded-full absolute top-1 transition-all duration-300"
                style={{ left: seconds % 2 === 0 ? "1px" : "3px" }}
              />
            </div>
          </div>

          {/* Jarum Jam */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="absolute w-1.5 h-9 bg-zinc-900 rounded-full origin-bottom"
              style={{ transform: `translateY(-50%) rotate(${hrDeg}deg)` }}
            />
            <div
              className="absolute w-1 h-12 bg-blue-600 rounded-full origin-bottom"
              style={{ transform: `translateY(-50%) rotate(${minDeg}deg)` }}
            />
            <div
              className="absolute w-0.5 h-14 bg-red-500 rounded-full origin-bottom transition-transform duration-150"
              style={{ transform: `translateY(-50%) rotate(${secDeg}deg)` }}
            />
            <div className="w-3 h-3 bg-yellow-400 border-2 border-zinc-900 rounded-full z-10" />
          </div>

          <div className="absolute bottom-5 w-5 h-2 border-b-2 border-zinc-900 rounded-b-full" />
        </div>
      </div>

      <div className="relative -mt-2 flex flex-col items-center anim-pendulum z-0 pointer-events-none">
        <div className="w-1.5 h-5 bg-zinc-900" />
        <div className="w-5 h-5 bg-amber-400 border-2 border-zinc-900 rounded-full comic-shadow-sm flex items-center justify-center text-[9px]">
          ⏰
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("IDLE"); // 'IDLE' | 'ARMED' | 'RINGING' | 'DISMISSED'
  const [currentTime, setCurrentTime] = useState("");
  const [targetTime, setTargetTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  const TOTAL_HITS = 10; // Default 10 Hit Murni
  const [remainingHits, setRemainingHits] = useState(TOTAL_HITS);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [misses, setMisses] = useState(0);
  const [bombStrikes, setBombStrikes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [bombFlash, setBombFlash] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [splats, setSplats] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [clearedDuration, setClearedDuration] = useState(0);
  const [swatterPos, setSwatterPos] = useState({ x: -100, y: -100 });
  const [swatterActive, setSwatterActive] = useState(false);

  // References
  const wakeLockRef = useRef(null);
  const arenaRef = useRef(null);

  // Smooth Free-Flow Mosquito Physics State
  const mosquitoPos = useRef({ x: 0, y: 0 });
  const mosquitoVel = useRef({ vx: 0, vy: 0 });
  const mosquitoBaseAngle = useRef(Math.random() * Math.PI * 2);
  const animFrameId = useRef(null);
  const mosquitoNodeRef = useRef(null);
  const speedMultRef = useRef(1.0);

  // 13x Smooth Free-Flow Dynamic Bombs
  const bombNodesRef = useRef([]);
  const bombsData = useRef([
    {
      x: 60,
      y: 180,
      vx: 3.2,
      vy: 2.5,
      size: 48,
      angle: Math.random() * Math.PI * 2,
      speed: 3.8,
    },
    {
      x: 260,
      y: 220,
      vx: -3.0,
      vy: 3.1,
      size: 50,
      angle: Math.random() * Math.PI * 2,
      speed: 4.1,
    },
    {
      x: 90,
      y: 340,
      vx: 3.8,
      vy: -2.8,
      size: 46,
      angle: Math.random() * Math.PI * 2,
      speed: 4.2,
    },
    {
      x: 230,
      y: 420,
      vx: -3.4,
      vy: -3.2,
      size: 52,
      angle: Math.random() * Math.PI * 2,
      speed: 3.9,
    },
    {
      x: 150,
      y: 500,
      vx: 2.9,
      vy: 3.8,
      size: 48,
      angle: Math.random() * Math.PI * 2,
      speed: 4.0,
    },
    {
      x: 40,
      y: 580,
      vx: -3.6,
      vy: 2.5,
      size: 50,
      angle: Math.random() * Math.PI * 2,
      speed: 3.7,
    },
    {
      x: 270,
      y: 640,
      vx: 3.2,
      vy: -3.5,
      size: 46,
      angle: Math.random() * Math.PI * 2,
      speed: 4.3,
    },
    {
      x: 160,
      y: 300,
      vx: -2.8,
      vy: 3.2,
      size: 52,
      angle: Math.random() * Math.PI * 2,
      speed: 3.9,
    },
    {
      x: 25,
      y: 120,
      vx: 2.4,
      vy: 3.4,
      size: 44,
      angle: Math.random() * Math.PI * 2,
      speed: 4.0,
    },
    {
      x: 190,
      y: 140,
      vx: -3.8,
      vy: 2.1,
      size: 46,
      angle: Math.random() * Math.PI * 2,
      speed: 4.4,
    },
    {
      x: 285,
      y: 160,
      vx: -2.6,
      vy: 3.6,
      size: 48,
      angle: Math.random() * Math.PI * 2,
      speed: 4.2,
    },
    {
      x: 120,
      y: 260,
      vx: 3.6,
      vy: -2.2,
      size: 50,
      angle: Math.random() * Math.PI * 2,
      speed: 4.5,
    },
    {
      x: 275,
      y: 300,
      vx: -3.5,
      vy: -2.9,
      size: 44,
      angle: Math.random() * Math.PI * 2,
      speed: 4.1,
    },
  ]);

  useEffect(() => {
    speedMultRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(" ")[0]);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (screen !== "ARMED") return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (currentHHMM === targetTime && now.getSeconds() === 0) {
        triggerRinging();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [screen, targetTime]);

  const requestWakeLock = async () => {
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch (err) {
        console.warn("WakeLock failed:", err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
    }
  };

  const handleArmAlarm = async () => {
    audio.init();
    await requestWakeLock();
    setScreen("ARMED");
  };

  // Relokasi nyamuk setelah smack atau kejadian khusus di arena.
  const relocateMosquitoInstantly = (arenaW, arenaH, center = false) => {
    const bounds = getMosquitoFlightBounds(arenaW, arenaH);
    const prevX = mosquitoPos.current.x;
    const prevY = mosquitoPos.current.y;
    // Adaptive: 40% of max dimension, at least 150px
    const minDistance = Math.max(150, Math.min(250, Math.max(arenaW, arenaH) * 0.4));

    let newX, newY;
    if (center) {
      // Zona tengah acak: hindari 20% area terluar di setiap sisi supaya
      // nyamuk tidak muncul di pinggir, tetapi juga tidak selalu di titik sama.
      const safeWidth = bounds.maxX - bounds.minX;
      const safeHeight = bounds.maxY - bounds.minY;
      const safeMinX = bounds.minX + safeWidth * 0.2;
      const safeMaxX = bounds.maxX - safeWidth * 0.2;
      const safeMinY = bounds.minY + safeHeight * 0.2;
      const safeMaxY = bounds.maxY - safeHeight * 0.2;
      const minCenterDistance = Math.min(100, Math.max(arenaW, arenaH) * 0.15);
      let attempts = 0;

      do {
        newX = safeMinX + Math.random() * (safeMaxX - safeMinX);
        newY = safeMinY + Math.random() * (safeMaxY - safeMinY);
        attempts++;
      } while (
        Math.hypot(newX - prevX, newY - prevY) < minCenterDistance &&
        attempts < 30
      );
    } else {
      let attempts = 0;
      do {
        newX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        newY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
        attempts++;
      } while (
        Math.hypot(newX - prevX, newY - prevY) < minDistance &&
        attempts < 50
      );
    }

    mosquitoPos.current = { x: newX, y: newY };

    // Set velocity to point AWAY from previous position (so it actually flies far)
    const awayDistance = Math.hypot(newX - prevX, newY - prevY);
    const awayAngle = awayDistance > 1
      ? Math.atan2(newY - prevY, newX - prevX)
      : Math.random() * Math.PI * 2;
    mosquitoBaseAngle.current = awayAngle;
    const spd = (MOSQUITO_BASE_SPEED + Math.random() * 80) * speedMultRef.current;
    mosquitoVel.current = {
      vx: Math.cos(awayAngle) * spd,
      vy: Math.sin(awayAngle) * spd,
    };

    // Pindahkan beberapa bom secara organis
    bombsData.current.forEach((b) => {
      if (Math.random() < 0.5) {
        b.angle = Math.random() * Math.PI * 2;
        b.vx = Math.cos(b.angle) * b.speed;
        b.vy = Math.sin(b.angle) * b.speed;
      }
    });
  };

  const triggerRinging = () => {
    setRemainingHits(TOTAL_HITS);
    setSpeedMultiplier(1.0);
    speedMultRef.current = 1.0;
    setMisses(0);
    setBombStrikes(0);
    setCombo(0);
    setSplats([]);
    setStartTime(Date.now());
    setScreen("RINGING");
    audio.startAlarm();

    if (arenaRef.current) {
      relocateMosquitoInstantly(
        arenaRef.current.clientWidth,
        arenaRef.current.clientHeight,
      );
    }
  };

  // ULTRA-SMOOTH ORGANIC FLIGHT — DIRECTIONAL COMMIT MODEL (NO JITTER)
  useEffect(() => {
    if (screen !== "RINGING") return;

    let isMounted = true;
    let lastTimestamp = null;
    let lastArenaSize = null;
    let targetPoint = null;
    let targetStartedAt = 0;
    let coverageIndex = 0;
    let coverageOrder = Array.from({ length: 9 }, (_, index) => index);

    // Sembilan sektor membuat nyamuk mengunjungi kiri, tengah, kanan,
    // atas, dan bawah; gerak tidak lagi bergantung pada kebetulan arah.
    const shuffleCoverageOrder = () => {
      coverageOrder = coverageOrder
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
      coverageIndex = 0;
    };

    const chooseNextTarget = (timestamp, bounds) => {
      if (coverageIndex >= coverageOrder.length) shuffleCoverageOrder();

      const sector = coverageOrder[coverageIndex++];
      const column = sector % 3;
      const row = Math.floor(sector / 3);
      const xRatio = [0.08, 0.5, 0.92][column];
      const yRatio = [0.08, 0.5, 0.92][row];
      const xJitter = (Math.random() - 0.5) * 0.12;
      const yJitter = (Math.random() - 0.5) * 0.12;

      targetPoint = {
        x: bounds.minX + (bounds.maxX - bounds.minX) * Math.min(1, Math.max(0, xRatio + xJitter)),
        y: bounds.minY + (bounds.maxY - bounds.minY) * Math.min(1, Math.max(0, yRatio + yJitter)),
      };
      targetStartedAt = timestamp;
    };

    shuffleCoverageOrder();

    const gameLoop = (timestamp) => {
      if (!isMounted || !arenaRef.current) return;

      const rect = arenaRef.current.getBoundingClientRect();
      const arenaW = rect.width;
      const arenaH = rect.height;

      const bounds = getMosquitoFlightBounds(arenaW, arenaH);
      const arenaSizeChanged =
        !lastArenaSize ||
        lastArenaSize.width !== arenaW ||
        lastArenaSize.height !== arenaH;

      if (arenaSizeChanged) {
        lastArenaSize = { width: arenaW, height: arenaH };
        mosquitoPos.current.x = Math.min(bounds.maxX, Math.max(bounds.minX, mosquitoPos.current.x));
        mosquitoPos.current.y = Math.min(bounds.maxY, Math.max(bounds.minY, mosquitoPos.current.y));
        bombsData.current.forEach((bomb) => {
          bomb.x = Math.min(bounds.maxX, Math.max(bounds.minX, bomb.x));
          bomb.y = Math.min(bounds.maxY, Math.max(bounds.minY, bomb.y));
        });
        targetPoint = null;
      }

      if (!targetPoint) chooseNextTarget(timestamp, bounds);

      // Delta time membuat kecepatan konsisten di 60/90/120Hz.
      const isFirstFrame = lastTimestamp === null;
      const deltaTime = isFirstFrame
        ? 0
        : Math.min(0.05, Math.max(0.001, (timestamp - lastTimestamp) / 1000));
      lastTimestamp = timestamp;

      const distanceToTarget = Math.hypot(
        targetPoint.x - mosquitoPos.current.x,
        targetPoint.y - mosquitoPos.current.y,
      );
      if (distanceToTarget < 28 || timestamp - targetStartedAt > 1900) {
        chooseNextTarget(timestamp, bounds);
      }

      // Slight organic curve (gentle banking, only ±0.4 rad) instead of wild oscillation
      const t = timestamp * 0.001;
      const targetHeading = Math.atan2(
        targetPoint.y - mosquitoPos.current.y,
        targetPoint.x - mosquitoPos.current.x,
      );
      const gentleCurve = Math.sin(t * 2.1 + coverageIndex) * 0.2;
      const currentHeading = targetHeading + gentleCurve;
      const currentSpeed = MOSQUITO_BASE_SPEED * speedMultRef.current;
      const targetVx = Math.cos(currentHeading) * currentSpeed;
      const targetVy = Math.sin(currentHeading) * currentSpeed;

      // Smooth but committed lerp (0.08 — follows direction without overshoot jitter)
      const steering = 1 - Math.exp(-6 * deltaTime);
      if (isFirstFrame) {
        mosquitoVel.current.vx = targetVx;
        mosquitoVel.current.vy = targetVy;
      }
      mosquitoVel.current.vx += (targetVx - mosquitoVel.current.vx) * steering;
      mosquitoVel.current.vy += (targetVy - mosquitoVel.current.vy) * steering;

      mosquitoPos.current.x += mosquitoVel.current.vx * deltaTime;
      mosquitoPos.current.y += mosquitoVel.current.vy * deltaTime;

      // SEAMLESS OFF-SCREEN WRAP
      const reachedEdge =
        mosquitoPos.current.x <= bounds.minX || mosquitoPos.current.x >= bounds.maxX ||
        mosquitoPos.current.y <= bounds.minY || mosquitoPos.current.y >= bounds.maxY;
      mosquitoPos.current.x = Math.min(bounds.maxX, Math.max(bounds.minX, mosquitoPos.current.x));
      mosquitoPos.current.y = Math.min(bounds.maxY, Math.max(bounds.minY, mosquitoPos.current.y));
      if (reachedEdge) targetPoint = null;

      const angleDeg =
        Math.atan2(mosquitoVel.current.vy, mosquitoVel.current.vx) *
          (180 / Math.PI) +
        90;
      if (mosquitoNodeRef.current) {
        mosquitoNodeRef.current.style.transform = `translate3d(${mosquitoPos.current.x}px, ${mosquitoPos.current.y}px, 0) rotate(${angleDeg}deg)`;
      }

      // 2. SMOOTH ORGANIC BOMBS (SILKY DRIFT)
      bombsData.current.forEach((bomb, idx) => {
        const bt = t + idx * 1.4;
        const mosquitoCenterX = mosquitoPos.current.x + MOSQUITO_SIZE / 2;
        const mosquitoCenterY = mosquitoPos.current.y + MOSQUITO_SIZE / 2;
        const bombCenterX = bomb.x + bomb.size / 2;
        const bombCenterY = bomb.y + bomb.size / 2;
        const bombDx = mosquitoCenterX - bombCenterX;
        const bombDy = mosquitoCenterY - bombCenterY;
        const bombDistance = Math.hypot(bombDx, bombDy);
        const driftHeading = bomb.angle + Math.sin(bt * 0.9) * 0.7;
        const coverageSector = (idx + Math.floor(timestamp / 2800)) % 15;
        const coverageColumn = coverageSector % 5;
        const coverageRow = Math.floor(coverageSector / 5);
        const coverageXRatio = [0.05, 0.275, 0.5, 0.725, 0.95][coverageColumn];
        const coverageYRatio = [0.08, 0.5, 0.92][coverageRow];
        const coverageTargetX = bounds.minX + (bounds.maxX - bounds.minX) * coverageXRatio;
        const coverageTargetY = bounds.minY + (bounds.maxY - bounds.minY) * coverageYRatio;
        const coverageHeading = Math.atan2(
          coverageTargetY - bombCenterY,
          coverageTargetX - bombCenterX,
        );
        const coverageDelta = Math.atan2(
          Math.sin(coverageHeading - driftHeading),
          Math.cos(coverageHeading - driftHeading),
        );
        const chaseHeading = Math.atan2(bombDy, bombDx);
        const chaseStrength = Math.max(0, 1 - bombDistance / 360) * 0.35;
        const headingDelta = Math.atan2(
          Math.sin(chaseHeading - driftHeading),
          Math.cos(chaseHeading - driftHeading),
        );
        const bHeading = driftHeading + coverageDelta * 0.45 + headingDelta * chaseStrength;
        const bombSpeed = bomb.speed * (1.35 + chaseStrength * 0.2);
        const bTargetVx = Math.cos(bHeading) * bombSpeed;
        const bTargetVy = Math.sin(bHeading) * bombSpeed;

        bomb.vx += (bTargetVx - bomb.vx) * 0.06;
        bomb.vy += (bTargetVy - bomb.vy) * 0.06;

        bomb.x += bomb.vx;
        bomb.y += bomb.vy;

        if (bomb.x < bounds.minX - bomb.size) bomb.x = bounds.maxX;
        else if (bomb.x > bounds.maxX + bomb.size) bomb.x = bounds.minX - bomb.size;

        if (bomb.y < bounds.minY - bomb.size) bomb.y = bounds.maxY;
        else if (bomb.y > bounds.maxY + bomb.size) bomb.y = bounds.minY - bomb.size;

        // Bom yang mendekat mengganggu arah terbang nyamuk, seperti rintangan
        // bergerak, sehingga nyamuk tidak bisa mengikuti jalur target dengan mudah.
        const updatedBombDx = mosquitoCenterX - (bomb.x + bomb.size / 2);
        const updatedBombDy = mosquitoCenterY - (bomb.y + bomb.size / 2);
        const updatedBombDistance = Math.hypot(updatedBombDx, updatedBombDy);
        if (updatedBombDistance > 0 && updatedBombDistance < 140) {
          const danger = 1 - updatedBombDistance / 140;
          const repulsion = 450 * danger * deltaTime;
          mosquitoVel.current.vx += (updatedBombDx / updatedBombDistance) * repulsion;
          mosquitoVel.current.vy += (updatedBombDy / updatedBombDistance) * repulsion;
        }

        const node = bombNodesRef.current[idx];
        if (node) {
          node.style.transform = `translate3d(${bomb.x}px, ${bomb.y}px, 0)`;
        }
      });

      animFrameId.current = requestAnimationFrame(gameLoop);
    };

    animFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      isMounted = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [screen]);

  // Refleks AI Nyamuk: Menghindar Kuat saat Jari Mendekat
  const handleArenaPointerMove = (e) => {
    if (screen !== "RINGING") return;
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const dx = mosquitoPos.current.x + 14 - px;
    const dy = mosquitoPos.current.y + 14 - py;
    const dist = Math.hypot(dx, dy);

    if (dist < 80 && Math.random() < 0.7) {
      // Strong burst away from finger
      const escapeBoost = 160 * speedMultRef.current;
      mosquitoVel.current.vx += (dx / dist) * escapeBoost;
      mosquitoVel.current.vy += (dy / dist) * escapeBoost;
    }
  };

  // Arena Miss Handler
  const handleArenaPointerDown = (e) => {
    e.preventDefault();
    if (screen !== "RINGING") return;

    const rect = arenaRef.current?.getBoundingClientRect();
    if (rect) {
      setSwatterPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setSwatterActive(true);
      setTimeout(() => setSwatterActive(false), 140);
    }

    if (navigator.vibrate) navigator.vibrate(100);

    audio.playPenalty();
    setMisses((m) => m + 1);
    setCombo(0);
    setSpeedMultiplier((spd) => Math.min(2, +(spd + 0.03).toFixed(2)));
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 260);
  };

  // SUCCESS HIT: RELOCATE INSTANTLY!
  const handleMosquitoHit = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (screen !== "RINGING") return;

    if (navigator.vibrate) navigator.vibrate([60, 40, 80]);
    audio.playSlap();

    const currentCombo = combo + 1;
    setCombo(currentCombo);

    const word = COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
    const currentX = mosquitoPos.current.x;
    const currentY = mosquitoPos.current.y;
    // Only show latest smack label (replace previous)
    setSplats([
      {
        id: Date.now() + Math.random(),
        x: currentX,
        y: currentY,
        word: currentCombo > 1 ? `${word} x${currentCombo}` : word,
        isBomb: false,
      },
    ]);

    const nextHits = remainingHits - 1;
    setRemainingHits(nextHits);

    // Setelah berhasil dismack, selalu mulai lagi dari tengah arena.
    if (arenaRef.current) {
      relocateMosquitoInstantly(
        arenaRef.current.clientWidth,
        arenaRef.current.clientHeight,
        true,
      );
    }

    if (nextHits <= 0) {
      audio.stopAlarm();
      audio.playVictory();
      releaseWakeLock();
      setClearedDuration(Math.round((Date.now() - startTime) / 1000));
      setScreen("DISMISSED");
    }
  };

  // BOMB HIT: mundurkan progres tiga nyamuk, maksimum tetap 10.
  const handleBombHit = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    if (screen !== "RINGING") return;

    if (navigator.vibrate) navigator.vibrate([250, 100, 250, 100, 400]);
    audio.playExplosion();

    // Tiga nyamuk yang sudah tersmack dikembalikan ke daftar target.
    setRemainingHits((hits) => Math.min(TOTAL_HITS, hits + 1));
    setBombStrikes((b) => b + 1);
    setMisses((m) => m + 4);
    setCombo(0);
    setSpeedMultiplier((spd) => Math.min(2, +(spd + 0.04).toFixed(2)));

    const bomb = bombsData.current[index];
    const word = BOMB_WORDS[Math.floor(Math.random() * BOMB_WORDS.length)];
    // Only show latest bomb label (replace previous)
    setSplats([
      {
        id: Date.now() + Math.random(),
        x: bomb.x,
        y: bomb.y,
        word,
        isBomb: true,
      },
    ]);

    if (arenaRef.current) {
      relocateMosquitoInstantly(
        arenaRef.current.clientWidth,
        arenaRef.current.clientHeight,
      );
    }

    setBombFlash(true);
    setIsShaking(true);
    setTimeout(() => {
      setBombFlash(false);
      setIsShaking(false);
    }, 500);
  };

  const handleReset = () => {
    audio.stopAlarm();
    releaseWakeLock();
    setScreen("IDLE");
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audio.setMuted(next);
  };

  const getRank = () => {
    if (bombStrikes === 0 && misses === 0 && clearedDuration < 15) {
      return { title: "GODLIKE SWAT MASTER 👑🏆", color: "text-amber-500" };
    }
    if (bombStrikes === 0 && clearedDuration < 30) {
      return { title: "TOUCHSCREEN NINJA ⚡", color: "text-emerald-500" };
    }
    if (bombStrikes > 0) {
      return { title: "EXPLOSIVE SURVIVOR 💣🔥", color: "text-rose-600" };
    }
    return { title: "AWAKE HERO 🥊", color: "text-blue-500" };
  };

  return (
    <div className="fixed inset-0 select-none overflow-hidden font-sans touch-manipulation bg-zinc-950 text-zinc-900 h-[100dvh] w-screen flex justify-center items-center">
      {/* ---------------- SCREEN 1: IDLE / ARMED ---------------- */}
      {(screen === "IDLE" || screen === "ARMED") && (
        <div className="relative flex h-full w-full max-w-lg flex-col justify-between items-center bg-amber-50 p-4 sm:p-6 border-4 sm:border-8 border-zinc-900 overflow-y-auto">
          {/* Top Bar */}
          <div className="w-full flex justify-between items-center z-10">
            {/* <div className="inline-flex items-center gap-1.5 bg-yellow-300 border-3 border-zinc-900 px-3 py-1 rounded-xl comic-shadow-sm text-[11px] sm:text-xs font-black uppercase">
              <Sparkles className="w-3.5 h-3.5 text-zinc-900 animate-spin" />
              <span>Fluid Free-Flow 💣</span>
            </div> */}

            <button
              onClick={toggleMute}
              className="p-2 bg-white border-3 border-zinc-900 rounded-xl comic-shadow-sm hover:bg-yellow-200 active:translate-x-0.5 active:translate-y-0.5 transition-all text-zinc-900"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-red-600" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-700" />
              )}
            </button>
          </div>

          {/* Title Header */}
          <div className="flex flex-col items-center mt-1 text-center z-10">
            <div className="inline-flex items-center gap-2 bg-yellow-400 border-4 border-zinc-900 px-4 py-1.5 rounded-2xl comic-shadow-lg transform -rotate-1 hover:rotate-0 transition-transform">
              <span className="text-2xl sm:text-3xl animate-bounce">🦟</span>
              <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900">
                Mosquito Slap!
              </h1>
            </div>
            {/* <p className="mt-1.5 text-[10px] sm:text-xs font-black uppercase bg-white border-2 border-zinc-900 px-3 py-0.5 rounded-full text-zinc-800 comic-shadow-sm">
              🎯 Fluid Free-Flow • 13 Bom Ranjau
            </p> */}
          </div>

          {/* ANIMATED CLOCK & WAKE TIME */}
          <div className="flex flex-col items-center w-full max-w-sm my-auto space-y-3 z-10">
            <PlayfulAnimatedClock timeString={currentTime} />

            <div className="bg-rose-200 border-4 border-zinc-900 rounded-2xl p-3 w-full text-center comic-shadow-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] sm:text-xs uppercase font-black text-zinc-800 tracking-wider">
                  ⏰ Set Alarm Kamu
                </span>
                <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-md border border-zinc-800">
                  Live: {currentTime || "--:--:--"}
                </span>
              </div>
              <input
                id="alarm-time"
                type="time"
                disabled={screen === "ARMED"}
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="bg-white text-2xl sm:text-3xl font-black px-4 py-1 rounded-xl border-3 border-zinc-900 text-center text-zinc-900 comic-shadow-sm focus:outline-none focus:ring-4 focus:ring-yellow-400 disabled:opacity-60 w-44 mx-auto block"
              />
            </div>

            {/* <div className="bg-amber-300 border-3 border-zinc-900 rounded-xl p-2 w-full comic-shadow flex items-center justify-center gap-2">
              <Target className="w-4 h-4 text-zinc-900" />
              <span className="text-[11px] font-black uppercase text-zinc-900">
                10 Hit Presisi • Kena Smack Langsung Pindah!
              </span>
            </div> */}

            {screen === "ARMED" && (
              <div className="bg-emerald-300 border-3 border-zinc-900 text-zinc-900 px-3 py-1.5 rounded-xl text-xs font-black comic-shadow flex items-center justify-center gap-2 animate-pulse w-full">
                <ShieldCheck className="w-5 h-5 text-emerald-900" />
                <span>ALARM AKTIF & LAYAR TERKUNCI MELEK!</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full max-w-sm mb-1 z-10">
            {screen === "IDLE" ? (
              <button
                onClick={handleArmAlarm}
                className="w-full py-3 bg-lime-400 hover:bg-lime-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-zinc-900 font-black rounded-xl border-4 border-zinc-900 comic-shadow-lg text-base uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <BellRing className="w-5 h-5" />
                <span>Pasang Alarm & Tidur</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  releaseWakeLock();
                  setScreen("IDLE");
                }}
                className="w-full py-3 bg-zinc-200 hover:bg-zinc-100 active:translate-x-1 active:translate-y-1 active:shadow-none text-zinc-900 font-black rounded-xl border-4 border-zinc-900 comic-shadow-lg text-base uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Matikan Mode Alarm</span>
              </button>
            )}

            <button
              onClick={() => {
                audio.init();
                requestWakeLock();
                triggerRinging();
              }}
              className="w-full py-2 bg-yellow-300 hover:bg-yellow-200 active:translate-x-1 active:translate-y-1 active:shadow-none text-zinc-900 font-black rounded-xl border-3 border-zinc-900 comic-shadow text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-amber-900 fill-amber-500" />
              <span>Main Game</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- SCREEN 2: BATTLE ARENA (FREE-FLOW) ---------------- */}
      {screen === "RINGING" && (
        <div
          ref={arenaRef}
          onPointerDown={handleArenaPointerDown}
          onPointerMove={handleArenaPointerMove}
          className={`relative h-full w-full max-w-2xl bg-rose-100 overflow-hidden cursor-crosshair border-4 sm:border-8 border-zinc-900 select-none ${
            isShaking
              ? bombFlash
                ? "anim-shake-extreme bg-orange-500"
                : "anim-shake-extreme bg-rose-300"
              : ""
          }`}
        >
          {/* Top Arcade HUD */}
          <div className="absolute top-2 inset-x-2 flex justify-between items-center gap-1 z-30 pointer-events-none">
            {/* Sisa Nyamuk */}
            <div className="bg-yellow-300 border-3 border-zinc-900 px-2 py-1 rounded-xl comic-shadow flex flex-col items-center">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-zinc-800">
                Sisa ({remainingHits}/{TOTAL_HITS})
              </span>
              <div className="flex items-center gap-0.5 flex-wrap max-w-[120px] justify-center">
                {Array.from({ length: TOTAL_HITS }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-[10px] sm:text-xs transition-all duration-150 ${
                      i < remainingHits
                        ? "scale-100 filter-none"
                        : "opacity-20 scale-75 grayscale"
                    }`}
                  >
                    `🦟`
                  </span>
                ))}
              </div>
            </div>

            {/* Speed */}
            <div className="bg-cyan-300 border-3 border-zinc-900 px-2.5 py-1 rounded-xl comic-shadow text-center">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-zinc-800">
                Speed
              </span>
              <div className="text-sm sm:text-base font-black text-zinc-900 flex items-center justify-center gap-0.5">
                <span>{speedMultiplier.toFixed(1)}x</span>
                <Flame className="w-3 h-3 text-orange-600 fill-orange-500 animate-bounce" />
              </div>
            </div>

            {/* 13x Bombs Status */}
            <div className="bg-amber-400 border-3 border-zinc-900 px-2.5 py-1 rounded-xl comic-shadow text-center">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-zinc-900">
                Bom!
              </span>
              <div className="text-sm sm:text-base font-black text-rose-950 flex items-center justify-center gap-0.5">
                <Bomb className="w-3.5 h-3.5 text-zinc-900 fill-zinc-900 animate-pulse" />
                <span>
                  {bombStrikes > 0 ? `${bombStrikes}x 💥` : "HINDARI"}
                </span>
              </div>
            </div>

            {/* Misses */}
            <div className="bg-rose-300 border-3 border-zinc-900 px-2.5 py-1 rounded-xl comic-shadow text-center">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-zinc-800">
                Meleset
              </span>
              <div className="text-sm sm:text-base font-black text-rose-950">
                ❌ {misses}
              </div>
            </div>
          </div>

          {/* Splats & Decals — clamped to stay inside arena */}
          {splats.map((splat) => {
            const arenaW = arenaRef.current?.clientWidth || 375;
            const arenaH = arenaRef.current?.clientHeight || 667;
            const labelW = 100; // perkiraan lebar label
            const labelH = 34;  // perkiraan tinggi label
            const clampedX = Math.max(6, Math.min(arenaW - labelW - 6, splat.x - labelW / 2));
            const clampedY = Math.max(80, Math.min(arenaH - labelH - 6, splat.y - labelH / 2));
            return (
            <div
              key={splat.id}
              style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
              className="absolute pointer-events-none anim-pop z-20"
            >
              <div
                className={`border-3 border-zinc-900 font-black text-xs uppercase px-2.5 py-1 rounded-xl comic-shadow-sm transform -rotate-12 ${
                  splat.isBomb
                    ? "bg-red-600 text-yellow-300 text-sm animate-bounce"
                    : "bg-yellow-400 text-zinc-900"
                }`}
              >
                {splat.isBomb ? "💣 " : "💥 "} {splat.word}
              </div>
            </div>
            );
          })}

          {/* Swatter Tap Animation */}
          {swatterActive && (
            <div
              style={{
                left: `${swatterPos.x - 20}px`,
                top: `${swatterPos.y - 20}px`,
              }}
              className="absolute pointer-events-none z-30 anim-pop text-3xl select-none"
            >
              🏸
            </div>
          )}

          {/* Bomb Flash Reset Banner */}
          {bombFlash && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40 bg-red-600/85 backdrop-blur-sm animate-pulse p-4">
              <div className="bg-black text-yellow-300 text-xl sm:text-3xl font-black px-5 py-3 border-6 border-yellow-400 rounded-3xl comic-shadow-lg transform -rotate-2 uppercase flex flex-col items-center gap-1.5 text-center">
                <div className="flex items-center gap-2">
                  <Skull className="w-8 h-8 text-red-500 animate-bounce" />
                  <span>KENA BOM! 💣💥</span>
                </div>
                <span className="text-xs sm:text-base text-white font-mono bg-red-800 px-3 py-1 rounded-xl">
                  PROGRES MUNDUR 1 HIT!
                </span>
              </div>
            </div>
          )}

          {/* Miss Penalty Banner */}
          {isShaking && !bombFlash && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 bg-red-600/20">
              <div className="bg-black text-yellow-300 text-base sm:text-xl font-black px-4 py-2 border-3 border-yellow-400 rounded-2xl comic-shadow-lg transform -rotate-2 uppercase flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 animate-bounce" />
                <span>MELESET! SPEED++ 💨</span>
              </div>
            </div>
          )}

          {/* 13X FREE-FLOW DANGER BOMBS */}
          {bombsData.current.map((bomb, index) => (
            <div
              key={index}
              ref={(el) => (bombNodesRef.current[index] = el)}
              onPointerDown={(e) => handleBombHit(e, index)}
              style={{ width: `${bomb.size}px`, height: `${bomb.size}px` }}
              className="absolute top-0 left-0 z-20 flex items-center justify-center cursor-pointer will-change-transform active:scale-90 transition-transform"
            >
              <div className="relative p-1 flex items-center justify-center anim-bomb-danger">
                <div className="absolute -inset-1 rounded-full border-2 border-dashed border-red-600 animate-spin opacity-90" />
                <div className="bg-red-500 border-2 border-black rounded-full p-1.5 comic-shadow-sm flex items-center justify-center">
                  <span className="text-xl sm:text-2xl drop-shadow select-none pointer-events-none">
                    💣
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* NYAMUK FREE-FLOW ORGANIK (~28px) */}
          <div
            ref={mosquitoNodeRef}
            onPointerDown={handleMosquitoHit}
            className="absolute top-0 left-0 w-8 h-8 z-20 flex items-center justify-center cursor-pointer will-change-transform active:scale-75"
          >
            <div className="relative p-0.5">
              <div className="absolute -inset-0.5 rounded-full border border-dashed border-red-500 animate-spin opacity-80" />
              <div className="relative select-none pointer-events-none flex items-center justify-center">
                <span className="text-2xl sm:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] anim-wings">
                  🦟
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SCREEN 3: VICTORY SCREEN ---------------- */}
      {screen === "DISMISSED" && (
        <div className="flex h-full w-full max-w-lg flex-col justify-between items-center bg-lime-100 p-6 text-center border-4 sm:border-8 border-zinc-900 overflow-y-auto">
          <div className="flex flex-col items-center mt-2">
            <div className="w-20 h-20 bg-yellow-300 border-4 border-zinc-900 rounded-full flex items-center justify-center text-4xl comic-shadow-lg animate-bounce mb-2">
              😎
            </div>

            <div className="bg-white border-4 border-zinc-900 px-5 py-1.5 rounded-2xl comic-shadow-lg transform -rotate-1">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900">
                10 Nyamuk Terbasmi!
              </h2>
            </div>

            {/* <div
              className={`mt-2 font-black text-xs sm:text-sm uppercase px-4 py-1 rounded-full border-2 border-zinc-900 bg-white comic-shadow-sm ${getRank().color}`}
            >
              {getRank().title}
            </div> */}
          </div>

          <div className="grid grid-cols-3 gap-2 w-full max-w-sm my-4">
            <div className="bg-white border-3 border-zinc-900 p-2.5 rounded-xl comic-shadow text-center">
              <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>Waktu</span>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5 font-mono">
                {clearedDuration}s
              </div>
            </div>

            <div className="bg-white border-3 border-zinc-900 p-2.5 rounded-xl comic-shadow text-center">
              <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase text-zinc-500">
                <Crosshair className="w-3 h-3" />
                <span>Meleset</span>
              </div>
              <div className="text-2xl font-black text-rose-500 mt-0.5 font-mono">
                {misses}
              </div>
            </div>

            <div className="bg-white border-3 border-zinc-900 p-2.5 rounded-xl comic-shadow text-center">
              <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase text-zinc-500">
                <Bomb className="w-3 h-3 text-rose-600" />
                <span>Bom Kena</span>
              </div>
              <div className="text-2xl font-black text-red-600 mt-0.5 font-mono">
                {bombStrikes}
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm mb-2 space-y-2">
            <button
              onClick={handleReset}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-zinc-900 font-black rounded-xl border-4 border-zinc-900 comic-shadow-lg text-base uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <Award className="w-5 h-5" />
              <span>☀️ Siap Mulai Hari</span>
            </button>

            {/* <button
              onClick={() => {
                audio.init();
                requestWakeLock();
                triggerRinging();
              }}
              className="w-full py-2 bg-white hover:bg-zinc-100 text-zinc-800 font-black rounded-xl border-3 border-zinc-900 comic-shadow-sm text-xs uppercase tracking-wider transition-all"
            >
              🔄 Main Lagi
            </button> */}
          </div>
        </div>
      )}
    </div>
  );
}
