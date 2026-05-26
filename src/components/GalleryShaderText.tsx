import { useRef, useState, useEffect } from 'react';
import { useAnimationFrame, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const NEO_BRUTALISM_COLORS = [
  '#CCFF00', // Acid Green
  '#FF007F', // Hot Pink
  '#00F0FF', // Cyber Cyan
  '#FF9900', // Mango
  '#E60000', // Blood Red
  '#00FF80', // Mint
  '#3D00FF', // Void Purple
  '#0055FF', // Electric Blue
  '#FFA6E5', // Bubblegum
  '#FFFF00', // Toxic Yellow
  '#FF5500', // Neon Orange
  '#D000FF', // Screaming Violet
  '#33FF00', // Nuclear Green
  '#00FFAA'  // Bright Teal
];

export default function GalleryShaderText({ text = "GALLERY", className = "" }: { text?: string; className?: string }) {
  const letters = text.split('');
  
  // Custom "uniforms" for our SVG shader
  const [noiseFreq, setNoiseFreq] = useState("0.02 0.1");
  const [scale, setScale] = useState(0);
  const [letterColors, setLetterColors] = useState<string[]>([]);
  const time = useRef(0);

  // Parallax Setup
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  const translateX = useTransform(smoothMouseX, [-1, 1], [-30, 30]);
  const translateY = useTransform(smoothMouseY, [-1, 1], [-30, 30]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('pointermove', handleMouseMove);
    return () => window.removeEventListener('pointermove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Initialize and randomly shift letter colors
  useEffect(() => {
    // Initial colors
    setLetterColors(letters.map(() => NEO_BRUTALISM_COLORS[Math.floor(Math.random() * NEO_BRUTALISM_COLORS.length)]));

    // Shift a random letter's color frequently to make it kinetic
    const colorInterval = setInterval(() => {
      setLetterColors((prev) => {
        const next = [...prev];
        const randomLetterIndex = Math.floor(Math.random() * next.length);
        const randomColorIndex = Math.floor(Math.random() * NEO_BRUTALISM_COLORS.length);
        next[randomLetterIndex] = NEO_BRUTALISM_COLORS[randomColorIndex];
        return next;
      });
    }, 150); // Glitches a color every 150ms

    return () => clearInterval(colorInterval);
  }, [letters.length]);

  // Animation Loop: acts like a Fragment Shader main() looping over time
  useAnimationFrame((_t, delta) => {
    time.current += delta * 0.001;
    
    // Create a rhythmic "pulse" or wave for the distortion
    // Using sine waves to simulate a scanner or CRT TV tracking issue
    const wave1 = Math.sin(time.current * 4.0);
    const wave2 = Math.cos(time.current * 7.0);
    
    // Base frequency dictates the grain size of the turbulence. 
    // High Y frequency = horizontal streaks like manga speed lines or VHS glitch.
    const fx = 0.01 + Math.abs(wave1 * 0.02);
    const fy = 0.1 + Math.abs(wave2 * 0.4);
    
    setNoiseFreq(`${fx} ${fy}`);
    
    // Scale dictates how far the pixels stretch or tear. 
    // We make it spike periodically for a "glitch snap"
    const isSnapping = Math.random() > 0.96;
    const currentScale = isSnapping ? 30 : 4 + Math.abs(wave1 * 4);
    setScale(currentScale);
  });

  return (
    <div className={className}>
      <motion.div 
        className="relative inline-block group cursor-crosshair"
        style={{
          x: translateX,
          y: translateY,
        }}
      >
        {/* THE SHADER DEFS */}
      <svg className="absolute w-0 h-0" style={{ pointerEvents: 'none' }}>
        <defs>
          <filter id="manga-shader" x="-20%" y="-20%" width="140%" height="140%">
            {/* 1. Generate the Noise Texture */}
            <feTurbulence 
              type="fractalNoise" 
              baseFrequency={noiseFreq} 
              numOctaves="1" 
              result="noise"
            />
            {/* 2. Push contrast of noise so it's chunky (manga half-tone/speedline feel) */}
            <feColorMatrix 
              type="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" 
              in="noise" 
              result="chunkyNoise"
            />
            {/* 3. Displace the original graphic based on the noise */}
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="chunkyNoise" 
              scale={scale} 
              xChannelSelector="R" 
              yChannelSelector="G" 
              result="distorted"
            />
            {/* 4. Let's create an 'ink bleed' or halftone offset layer */}
            <feOffset dx="8" dy="8" in="distorted" result="inkOffset" />
            
            {/* Color the offset solid black to act like a messy brutalist print shadow */}
            {/* RGBA for var(--color-ink) is #0A0A0A roughly, so ~0.04 */}
            <feColorMatrix 
              in="inkOffset" 
              type="matrix" 
              values="0 0 0 0 0.04  0 0 0 0 0.04  0 0 0 0 0.04  0 0 0 1 0" 
              result="inkBleed" 
            />
            {/* 5. Composite original distorted over the ink bleed shadow */}
            <feComposite in="distorted" in2="inkBleed" operator="over" />
          </filter>
        </defs>
      </svg>

      <h2 
        className="gallery-title-glitch flex gap-[2px]"
        // Apply the dynamic SVG filter shader
        style={{ filter: 'url(#manga-shader)' }}
      >
        {letters.map((letter, i) => (
          <span 
            key={i} 
            className="inline-block relative transition-transform duration-200 group-hover:-translate-y-4 group-hover:scale-110"
            style={{ 
              color: letterColors[i] || '#000000',
              fontWeight: 900,
              // We rely on the filter for the shadow, but keep the brutalist text stroke!
              WebkitTextStroke: '2px var(--color-ink)',
              transition: 'color 0.1s ease-in-out' // Smooth color snapping
            }}
          >
            {letter}
          </span>
        ))}
      </h2>
      </motion.div>
    </div>
  );
}
