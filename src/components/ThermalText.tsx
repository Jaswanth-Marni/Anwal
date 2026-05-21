import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ThermalText({ text }: { text: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // Split text into words to handle z-index weaving
  const words = text.split(' ');

  // Manage the entrance lock duration (heading slam + ribbon flow = 2.1s)
  useEffect(() => {
    setHasMounted(true);
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 2100);
    return () => clearTimeout(timer);
  }, []);

  // Motion variants for the 3D slime-slam heading
  const headingVariants = {
    initial: { 
      opacity: 0,
      scale: 3.5,
      rotate: -8,
      z: 400,
    },
    entrance: { 
      opacity: 1,
      scale: 1,
      rotate: 0,
      z: 0,
      transition: { 
        type: "spring" as const, 
        stiffness: 280, 
        damping: 18,
        mass: 1.1,
      }
    },
    normal: { 
      opacity: 1,
      scale: 1,
      rotate: 0,
      z: 0,
      transition: { duration: 0.3 }
    },
    hover: { 
      opacity: 0,
      scale: 1,
      rotate: 0,
      z: 0,
      transition: { duration: 0.3, ease: "easeOut" as const }
    }
  };

  // Motion variants for the ribbon path strokes (draw in from left to right)
  const pathVariants = {
    initial: {
      pathLength: 0,
      pathOffset: 0
    },
    entrance: {
      pathLength: 1,
      pathOffset: 0,
      transition: { 
        delay: 1.0,
        duration: 1.0, 
        ease: [0.16, 1, 0.3, 1] as const
      }
    },
    normal: {
      pathLength: 1,
      pathOffset: 0,
      transition: { duration: 0.6, ease: "easeOut" as const }
    },
    hover: {
      pathLength: 1,
      pathOffset: 1,
      transition: { duration: 0.6, ease: "easeOut" as const }
    }
  };

  // Motion variants for the Kanji text (slide in from the left)
  const textVariants = {
    initial: {
      startOffset: -1600
    },
    entrance: {
      startOffset: 0,
      transition: { 
        delay: 1.0,
        duration: 1.0, 
        ease: [0.16, 1, 0.3, 1] as const
      }
    },
    normal: {
      startOffset: 0,
      transition: { duration: 0.6, ease: "easeOut" as const }
    },
    hover: {
      startOffset: 1600,
      transition: { duration: 0.6, ease: "easeOut" as const }
    }
  };

  const currentAnimateState = !hasMounted 
    ? "initial" 
    : (isEntering ? "entrance" : (isHovered ? "hover" : "normal"));

  const showThermalEffect = !isEntering && isHovered;

  // The ribbon path — wider viewBox to prevent right-edge clipping
  // Path ends at x=1100, viewBox goes to 1200 for breathing room
  const ribbonPath = "M -50 150 C 50 200, 100 200, 200 100 C 300 0, 480 0, 480 150 C 480 300, 230 300, 230 150 C 230 0, 480 50, 580 150 C 680 250, 900 50, 1100 150";

  // Kanji text content
  const kanjiText = Array(8).fill("史上最高のアニメ • 神アニメ •").join(" ");

  return (
    <div 
      className="relative inline-block cursor-crosshair group"
      onMouseEnter={() => !isEntering && setIsHovered(true)}
      onMouseLeave={() => !isEntering && setIsHovered(false)}
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
    >
      
      {/* 
        SINGLE UNIFIED RIBBON SVG — Contains BOTH under and over layers
        Uses a single coordinate system so kanji text and ribbon path stay perfectly synced
      */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
        <svg 
          viewBox="-60 -50 1270 400"
          className="absolute top-1/2 left-0 w-full -translate-y-1/2 overflow-visible pointer-events-none" 
          style={{ height: '200%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Single shared path definition */}
            <path id="ribbon-path-shared" d={ribbonPath} />

            {/* Clip for UNDER layer: left entry, bottom of loop, and right exit — goes BEHIND text */}
            <clipPath id="clip-under">
              <rect x="-200" y="-100" width="350" height="600" />
              <rect x="150" y="155" width="420" height="350" />
              <rect x="570" y="-100" width="800" height="600" />
            </clipPath>
          </defs>

          {/* === UNDER LAYER (behind the heading text) === */}
          <g clipPath="url(#clip-under)">
            {/* The Solid Black Border */}
            <motion.path 
              d={ribbonPath}
              fill="transparent"
              stroke="var(--color-ink)"
              strokeWidth="30"
              strokeLinecap="butt"
              pathLength={0}
              initial="initial"
              animate={currentAnimateState}
              variants={pathVariants}
            />
            {/* The Solid Blue Strip Inside */}
            <motion.path 
              d={ribbonPath}
              fill="transparent"
              stroke="#1c0fea"
              strokeWidth="24"
              strokeLinecap="butt"
              pathLength={0}
              initial="initial"
              animate={currentAnimateState}
              variants={pathVariants}
            />
            {/* The Off-White Kanji Text — on the SAME path */}
            <text 
              fill="var(--color-paper)" 
              fontSize="12" 
              fontWeight="bold" 
              letterSpacing="0.2em"
              dy="4"
            >
              <motion.textPath 
                href="#ribbon-path-shared"
                startOffset={-1600}
                initial="initial"
                animate={currentAnimateState}
                variants={textVariants}
              >
                {kanjiText}
              </motion.textPath>
            </text>
          </g>
        </svg>
      </div>

      {/* 
        LAYER 2: THE BASE TEXT (z-index: 10)
      */}
      <motion.h1 
        className="font-display text-[8vw] leading-none tracking-tighter uppercase relative flex gap-[2vw]"
        style={{ 
          WebkitTextStroke: '3px var(--color-blood)',
          color: 'var(--color-ink)',
          zIndex: 10,
        }}
        initial="initial"
        animate={currentAnimateState}
        variants={headingVariants}
      >
        {words.map((word, i) => (
          <span key={`base-${i}`} className="relative">{word}</span>
        ))}
      </motion.h1>
      
      {/* 
        OVER LAYER SVG (z-index: 15) — only the top arc goes IN FRONT of text
        Uses the SAME viewBox and coordinate system as the under layer
      */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
        <svg 
          viewBox="-60 -50 1270 400"
          className="absolute top-1/2 left-0 w-full -translate-y-1/2 overflow-visible pointer-events-none" 
          style={{ height: '200%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <path id="ribbon-path-over" d={ribbonPath} />
            {/* Clip for OVER layer: only the top arc of the loop — goes IN FRONT of text */}
            <clipPath id="clip-over">
              <rect x="150" y="-100" width="420" height="265" />
            </clipPath>
          </defs>

          <g clipPath="url(#clip-over)">
            {/* The Solid Black Border */}
            <motion.path 
              d={ribbonPath}
              fill="transparent"
              stroke="var(--color-ink)"
              strokeWidth="30"
              strokeLinecap="butt"
              pathLength={0}
              initial="initial"
              animate={currentAnimateState}
              variants={pathVariants}
            />
            {/* The Solid Blue Strip Inside */}
            <motion.path 
              d={ribbonPath}
              fill="transparent"
              stroke="#1c0fea"
              strokeWidth="24"
              strokeLinecap="butt"
              pathLength={0}
              initial="initial"
              animate={currentAnimateState}
              variants={pathVariants}
            />
            {/* The Off-White Kanji Text — on the SAME path */}
            <text 
              fill="var(--color-paper)" 
              fontSize="12" 
              fontWeight="bold" 
              letterSpacing="0.2em"
              dy="4"
            >
              <motion.textPath 
                href="#ribbon-path-over"
                startOffset={-1600}
                initial="initial"
                animate={currentAnimateState}
                variants={textVariants}
              >
                {kanjiText}
              </motion.textPath>
            </text>
          </g>
        </svg>
      </div>

      {/* 
        LAYER 4: THE THERMAL EFFECT TEXT (z-index: 30)
        Hidden on normal, fades in on hover.
      */}
      <h1 
        className="font-display text-[8vw] leading-none tracking-tighter uppercase absolute top-0 right-0 pointer-events-none transition-opacity duration-300 flex gap-[2vw]"
        style={{
          opacity: (!isEntering && isHovered) ? 1 : 0,
          color: 'white',
          filter: (!isEntering && isHovered) ? 'url(#thermal-glow)' : 'none',
          WebkitTextStroke: '1px black',
          zIndex: 30
        }}
      >
        {words.map((word, i) => (
          <span key={`thermal-${i}`}>{word}</span>
        ))}
      </h1>

      {/* 3. THE SVG FILTER DEFINITION */}
      <svg width="0" height="0" className="absolute pointer-events-none -z-10">
        <filter id="thermal-glow" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="5" result="noise">
            {showThermalEffect && (
              <animate attributeName="baseFrequency" values="0.03;0.05;0.02;0.03" dur="5s" repeatCount="indefinite" />
            )}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" result="displaced">
             {showThermalEffect && (
               <animate attributeName="scale" values="15;25;15" dur="3s" repeatCount="indefinite" />
             )}
          </feDisplacementMap>
          <feGaussianBlur in="displaced" stdDeviation="5" result="blurred" />
          <feComponentTransfer in="blurred" result="thermal">
            <feFuncR type="table" tableValues="0 0 0.85 0.9 0.04" />
            <feFuncG type="table" tableValues="0 0 1.0 0.0 0.04" />
            <feFuncB type="table" tableValues="0 0 0.0 0.0 0.04" />
            <feFuncA type="table" tableValues="0 0 0.8 1 1" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="thermal" />
          </feMerge>
        </filter>
      </svg>
    </div>
  );
}
