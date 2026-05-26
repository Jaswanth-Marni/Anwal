import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { fetchTopAnime, type NormalizedAnime } from '../api/kitsu';

// === TRUE DUOTONE COLOR SCHEMES ===
// Each scheme defines the highlight color. Shadows are always pure black.
const COLOR_SCHEMES = [
  { name: 'BLOOD',      hex: '#E60000' },   // Makima / Chainsaw Man red
  { name: 'ACID',       hex: '#39FF14' },   // Midoriya green
  { name: 'CYBER',      hex: '#00B4D8' },   // Solo Leveling blue
  { name: 'BUBBLEGUM',  hex: '#FF69B4' },   // Momo Ayase pink
  { name: 'MANGO',      hex: '#FF8C00' },   // Warm orange
  { name: 'VOID',       hex: '#9B59FF' },   // Purple
];

function getSchemeForAnime(title: string, id: string): number {
  const t = title.toLowerCase();
  if (
    t.includes('titan') ||
    t.includes('shingeki') ||
    t.includes('death note') ||
    t.includes('demon slayer') ||
    t.includes('yaiba') ||
    t.includes('tokyo ghoul') ||
    t.includes('chainsaw')
  ) {
    return 0; // BLOOD
  }
  if (
    t.includes('hero academia') ||
    t.includes('hunter') ||
    t.includes('geass') ||
    t.includes('evangelion') ||
    t.includes('cyberpunk')
  ) {
    return 1; // ACID
  }
  if (
    t.includes('sword art') ||
    t.includes('fullmetal') ||
    t.includes('alchemist') ||
    t.includes('psycho-pass') ||
    t.includes('naruto')
  ) {
    return 2; // CYBER
  }
  if (
    t.includes('kaisen') ||
    t.includes('jujutsu') ||
    t.includes('stein') ||
    t.includes('gate') ||
    t.includes('re:zero')
  ) {
    return 5; // VOID
  }
  if (
    t.includes('one piece') ||
    t.includes('dragon ball') ||
    t.includes('bleach') ||
    t.includes('haikyuu') ||
    t.includes('no game')
  ) {
    return 4; // MANGO
  }
  // Fallback to hashing ID
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % COLOR_SCHEMES.length;
}

/** Convert hex (#RRGGBB) to { r, g, b } in 0-1 range */
function hexToRgb01(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

const baseVariants = {
  initial: {
    opacity: 0,
    x: 0,
    skewX: 0,
    scale: 1,
    filter: 'brightness(1) contrast(1)'
  },
  animate: {
    opacity: [0, 1, 0.7, 1, 0.8, 1],
    x: [0, -25, 30, -20, 15, -10, 0],
    skewX: [0, 8, -12, 10, -6, 4, 0],
    scaleX: [1, 1.15, 0.9, 1.1, 0.95, 1.05, 1],
    scaleY: [1, 0.85, 1.1, 0.9, 1.05, 0.98, 1],
    filter: [
      'brightness(2) contrast(1.5)',
      'brightness(1) contrast(1)',
      'brightness(1.5) contrast(1.3)',
      'brightness(0.8) contrast(1.8)',
      'brightness(1.3) contrast(1.1)',
      'brightness(1) contrast(1)'
    ],
    transition: {
      duration: 0.65,
      times: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1],
      ease: 'easeInOut' as const
    }
  },
  exit: {
    opacity: [1, 0.6, 0.3, 0],
    x: [0, 35, -45, 30, 0],
    skewX: [0, -15, 18, -10, 0],
    scaleX: [1, 1.25, 0.8, 1.15, 1],
    scaleY: [1, 0.75, 1.2, 0.85, 1],
    filter: [
      'brightness(1) contrast(1)',
      'brightness(2.5) contrast(2)',
      'brightness(4) contrast(3)',
      'brightness(6) contrast(5)'
    ],
    transition: {
      duration: 0.45,
      times: [0, 0.25, 0.6, 1],
      ease: 'easeIn' as const
    }
  }
};

const sliceVariantsA = {
  initial: { opacity: 0, x: 0, skewX: 0, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 },
  animate: {
    opacity: [0, 1, 0.8, 1, 0.9, 0],
    x: [0, -110, 120, -95, 80, 0],
    skewX: [0, -32, 28, -35, 20, 0],
    scaleX: [1, 1.35, 0.75, 1.3, 0.85, 1],
    clipPath: [
      'inset(5% 0% 92% 0%)',
      'inset(48% 0% 49% 0%)',
      'inset(78% 0% 19% 0%)',
      'inset(22% 0% 75% 0%)',
      'inset(90% 0% 2% 0%)',
      'inset(5% 0% 92% 0%)'
    ],
    filter: [
      'hue-rotate(90deg) brightness(3) contrast(2)',
      'hue-rotate(180deg) brightness(2.5) contrast(1.8)',
      'hue-rotate(-90deg) brightness(4) contrast(2.5)',
      'hue-rotate(270deg) brightness(3) contrast(2)',
      'hue-rotate(45deg) brightness(2.8) contrast(1.9)',
      'hue-rotate(90deg) brightness(3) contrast(2)'
    ],
    transition: { duration: 0.65, times: [0, 0.15, 0.3, 0.45, 0.65, 1], ease: 'linear' as const }
  },
  exit: {
    opacity: [0, 1, 1, 0],
    x: [0, 125, -135, 0],
    skewX: [0, 35, -38, 0],
    scaleX: [1, 1.4, 0.7, 1],
    clipPath: [
      'inset(12% 0% 85% 0%)',
      'inset(55% 0% 42% 0%)',
      'inset(30% 0% 68% 0%)',
      'inset(12% 0% 85% 0%)'
    ],
    filter: [
      'hue-rotate(120deg) brightness(4) contrast(3)',
      'hue-rotate(-120deg) brightness(3.5) contrast(2.5)',
      'hue-rotate(180deg) brightness(5) contrast(3)',
      'hue-rotate(120deg) brightness(4) contrast(3)'
    ],
    transition: { duration: 0.45, times: [0, 0.25, 0.65, 1], ease: 'linear' as const }
  }
};

const sliceVariantsB = {
  initial: { opacity: 0, x: 0, skewX: 0, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 },
  animate: {
    opacity: [0, 0.9, 1, 0.7, 1, 0],
    x: [0, 130, -90, 115, -70, 0],
    skewX: [0, 28, -35, 25, -18, 0],
    scaleX: [1, 0.8, 1.25, 0.75, 1.15, 1],
    clipPath: [
      'inset(15% 0% 80% 0%)',
      'inset(62% 0% 35% 0%)',
      'inset(3% 0% 95% 0%)',
      'inset(40% 0% 58% 0%)',
      'inset(82% 0% 15% 0%)',
      'inset(15% 0% 80% 0%)'
    ],
    filter: [
      'hue-rotate(-120deg) brightness(2.5) contrast(1.8)',
      'hue-rotate(90deg) brightness(4) contrast(2.5)',
      'hue-rotate(180deg) brightness(3) contrast(2)',
      'hue-rotate(-90deg) brightness(2.8) contrast(1.9)',
      'hue-rotate(270deg) brightness(3.5) contrast(2.2)',
      'hue-rotate(-120deg) brightness(2.5) contrast(1.8)'
    ],
    transition: { duration: 0.65, times: [0, 0.15, 0.3, 0.45, 0.65, 1], ease: 'linear' as const }
  },
  exit: {
    opacity: [0, 1, 1, 0],
    x: [0, -135, 125, 0],
    skewX: [0, -38, 35, 0],
    scaleX: [1, 0.7, 1.4, 1],
    clipPath: [
      'inset(28% 0% 68% 0%)',
      'inset(80% 0% 18% 0%)',
      'inset(48% 0% 49% 0%)',
      'inset(28% 0% 68% 0%)'
    ],
    filter: [
      'hue-rotate(-60deg) brightness(3.5) contrast(2.5)',
      'hue-rotate(180deg) brightness(5) contrast(3)',
      'hue-rotate(-180deg) brightness(4.5) contrast(2.8)',
      'hue-rotate(-60deg) brightness(3.5) contrast(2.5)'
    ],
    transition: { duration: 0.45, times: [0, 0.25, 0.65, 1], ease: 'linear' as const }
  }
};

const sliceVariantsC = {
  initial: { opacity: 0, x: 0, skewX: 0, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 },
  animate: {
    opacity: [0, 0.8, 1, 0.9, 0.7, 0],
    x: [0, -70, 85, -110, 60, 0],
    skewX: [0, -22, 18, -25, 15, 0],
    scaleX: [1, 1.2, 0.85, 1.15, 0.9, 1],
    clipPath: [
      'inset(33% 0% 64% 0%)',
      'inset(8% 0% 90% 0%)',
      'inset(52% 0% 46% 0%)',
      'inset(95% 0% 2% 0%)',
      'inset(20% 0% 78% 0%)',
      'inset(33% 0% 64% 0%)'
    ],
    filter: [
      'hue-rotate(180deg) brightness(3.5) contrast(2.2)',
      'hue-rotate(-45deg) brightness(2.8) contrast(1.9)',
      'hue-rotate(90deg) brightness(3) contrast(2)',
      'hue-rotate(-120deg) brightness(4) contrast(2.5)',
      'hue-rotate(270deg) brightness(3) contrast(2)',
      'hue-rotate(180deg) brightness(3.5) contrast(2.2)'
    ],
    transition: { duration: 0.65, times: [0, 0.15, 0.3, 0.45, 0.65, 1], ease: 'linear' as const }
  },
  exit: {
    opacity: [0, 1, 1, 0],
    x: [0, 95, -110, 0],
    skewX: [0, 25, -30, 0],
    scaleX: [1, 1.3, 0.8, 1],
    clipPath: [
      'inset(45% 0% 52% 0%)',
      'inset(5% 0% 92% 0%)',
      'inset(72% 0% 25% 0%)',
      'inset(45% 0% 52% 0%)'
    ],
    filter: [
      'hue-rotate(60deg) brightness(4) contrast(3)',
      'hue-rotate(-90deg) brightness(3) contrast(2)',
      'hue-rotate(240deg) brightness(5) contrast(3)',
      'hue-rotate(60deg) brightness(4) contrast(3)'
    ],
    transition: { duration: 0.45, times: [0, 0.25, 0.65, 1], ease: 'linear' as const }
  }
};

function getStudioForAnime(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('titan') || t.includes('shingeki')) return 'Wit Studio / MAPPA';
  if (t.includes('death note')) return 'Madhouse';
  if (t.includes('hero academia') || t.includes('boku no hero')) return 'Bones';
  if (t.includes('one punch') || t.includes('wanpanman')) return 'Madhouse / J.C.Staff';
  if (t.includes('tokyo ghoul')) return 'Studio Pierrot';
  if (t.includes('sword art')) return 'A-1 Pictures';
  if (t.includes('fullmetal') || t.includes('hagane no')) return 'Bones';
  if (t.includes('angel beats')) return 'P.A. Works';
  if (t.includes('steins;gate') || t.includes('steins gate')) return 'White Fox';
  if (t.includes('no game no life')) return 'Madhouse';
  if (t.includes('toradora')) return 'J.C.Staff';
  if (t.includes('hunter')) return 'Madhouse';
  if (t.includes('bleach')) return 'Studio Pierrot';
  if (t.includes('code geass')) return 'Sunrise';
  if (t.includes('your lie') || t.includes('shigatsu')) return 'A-1 Pictures';
  if (t.includes('demon slayer') || t.includes('kimetsu')) return 'Ufotable';
  if (t.includes('jujutsu')) return 'MAPPA';
  if (t.includes('naruto')) return 'Studio Pierrot';
  if (t.includes('one piece')) return 'Toei Animation';
  if (t.includes('cyberpunk')) return 'Trigger';
  if (t.includes('neon genesis') || t.includes('evangelion')) return 'Gainax / Khara';
  return 'Production I.G';
}

function getStudioStampData(studio: string): { kanji: string; romaji: string; shape: 'circle' | 'square' | 'hexagon' } {
  const s = studio.toLowerCase();
  if (s.includes('bones')) {
    return { kanji: '骨', romaji: 'BONES', shape: 'square' };
  }
  if (s.includes('madhouse')) {
    return { kanji: '狂', romaji: 'MADHOUSE', shape: 'circle' };
  }
  if (s.includes('pierrot')) {
    return { kanji: '道', romaji: 'PIERROT', shape: 'hexagon' };
  }
  if (s.includes('a-1')) {
    return { kanji: '一', romaji: 'A-1 PIX', shape: 'circle' };
  }
  if (s.includes('ufotable')) {
    return { kanji: '遊', romaji: 'UFOTABLE', shape: 'hexagon' };
  }
  if (s.includes('trigger')) {
    return { kanji: '弾', romaji: 'TRIGGER', shape: 'square' };
  }
  if (s.includes('toei')) {
    return { kanji: '東', romaji: 'TOEI', shape: 'circle' };
  }
  if (s.includes('sunrise')) {
    return { kanji: '日', romaji: 'SUNRISE', shape: 'circle' };
  }
  if (s.includes('mappa')) {
    return { kanji: '真', romaji: 'MAPPA', shape: 'square' };
  }
  if (s.includes('wit')) {
    return { kanji: '覇', romaji: 'WIT', shape: 'square' };
  }
  if (s.includes('gainax')) {
    return { kanji: '街', romaji: 'GAINAX', shape: 'circle' };
  }
  if (s.includes('white fox')) {
    return { kanji: '狐', romaji: 'W.FOX', shape: 'hexagon' };
  }
  return { kanji: '製', romaji: 'PRODUCTION', shape: 'square' };
}

function StudioStamp({ studio, color }: { studio: string; color: string }) {
  const { kanji, romaji, shape } = getStudioStampData(studio);

  return (
    <div className="relative w-28 h-28 flex items-center justify-center pointer-events-none select-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
      {/* Distressed ink texture overlay inside the SVG */}
      <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_40s_linear_infinite]" style={{ color }}>
        <defs>
          {/* A rough noise filter to simulate organic ink bleeding/distressing */}
          <filter id="stamp-rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        <g filter="url(#stamp-rough)">
          {/* Shape Border */}
          {shape === 'circle' && (
            <>
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4" />
              <circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            </>
          )}
          {shape === 'square' && (
            <>
              <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="4" rx="2" />
              <rect x="14" y="14" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" rx="1" />
            </>
          )}
          {shape === 'hexagon' && (
            <>
              <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="none" stroke="currentColor" strokeWidth="4" />
              <polygon points="50,11 83,30 83,70 50,89 17,70 17,30" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            </>
          )}

          {/* Central Kanji */}
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fill="currentColor"
            className="font-jp font-black text-4xl"
            style={{ fontSize: '36px', fontWeight: 900 }}
          >
            {kanji}
          </text>

          {/* Romaji label */}
          <text
            x="50"
            y="85"
            textAnchor="middle"
            fill="currentColor"
            className="font-mono font-bold"
            style={{ fontSize: '7px', letterSpacing: '0.1em' }}
          >
            {romaji}
          </text>
          
          <text
            x="50"
            y="23"
            textAnchor="middle"
            fill="currentColor"
            className="font-mono font-black"
            style={{ fontSize: '5px', letterSpacing: '0.2em' }}
          >
            STUDIO SEAL
          </text>
        </g>
      </svg>
    </div>
  );
}

interface HeroPosterProps {
  onLoaded?: () => void;
}

export default function HeroPoster({ onLoaded }: HeroPosterProps) {
  const [featuredList, setFeaturedList] = useState<NormalizedAnime[]>([]);
  const [featured, setFeatured] = useState<NormalizedAnime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setCurrentIndex] = useState(0);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [isStripHovered, setIsStripHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  // Close slider when changing featured anime
  useEffect(() => {
    setIsSliderOpen(false);
  }, [featured]);

  const [isGlitching, setIsGlitching] = useState(false);

  // Set isGlitching to true when featured changes, and set a timeout to turn it off
  useEffect(() => {
    if (!featured) return;
    setIsGlitching(true);
    const timer = setTimeout(() => {
      setIsGlitching(false);
    }, 800); // Glitch animations last 0.65s (650ms)
    return () => clearTimeout(timer);
  }, [featured]);

  // 3D Mouse Parallax Motion Values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for cursor interpolation
  const smoothMouseX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  // Map relative position (-1 to 1) to pixel translations (-20px to 20px)
  const imgTranslateX = useTransform(smoothMouseX, [-1, 1], [-20, 20]);
  const imgTranslateY = useTransform(smoothMouseY, [-1, 1], [-20, 20]);

  // Translate name strip in the opposite direction (+15px to -15px) for 3D depth
  const nameStripTranslateX = useTransform(smoothMouseX, [-1, 1], [15, -15]);
  const nameStripTranslateY = useTransform(smoothMouseY, [-1, 1], [15, -15]);

  // Translate stamp in the opposite direction (+30px to -30px) for high floating 3D depth
  const stampTranslateX = useTransform(smoothMouseX, [-1, 1], [30, -30]);
  const stampTranslateY = useTransform(smoothMouseY, [-1, 1], [30, -30]);

  // Handle pointer tracking
  const bannerRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return; // Disable parallax on mobile
    if (!bannerRef.current) return;
    const rect = bannerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Automatic scroll when slider opens on mobile
  useEffect(() => {
    if (isSliderOpen && isMobile) {
      setTimeout(() => {
        const container = bannerRef.current?.closest('.overflow-y-auto');
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 250); // Small delay to let Framer Motion animation begin expanding
    }
  }, [isSliderOpen, isMobile]);

  // Compute scheme directly from the active featured anime
  const scheme = useMemo(() => {
    if (!featured) return COLOR_SCHEMES[0];
    const idx = getSchemeForAnime(featured.title, featured.id);
    return COLOR_SCHEMES[idx];
  }, [featured]);

  // URL-encoded hex color for the SVG repeating background mesh
  const svgMeshColor = useMemo(() => scheme.hex.replace('#', '%23'), [scheme.hex]);

  // RGB components for the SVG filter matrix
  const { r, g, b } = useMemo(() => hexToRgb01(scheme.hex), [scheme.hex]);

  // Unique filter ID - static to prevent browser unbinding and flashing during transitions
  const filterId = 'duotone-active-hero-filter';

  // INIT: Fetch Kitsu top list via the shared service, then pick a random starter
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      const list = await fetchTopAnime();
      if (!isMounted) return;

      // Only keep items that have both a cover and poster image (to support responsive formats)
      const withCover = list.filter((a) => a.coverImage && a.posterImage);
      setFeaturedList(withCover);

      if (withCover.length > 0) {
        const randomStart = Math.floor(Math.random() * withCover.length);
        setCurrentIndex(randomStart);
        setFeatured(withCover[randomStart]);
      }

      setIsLoading(false);
      if (onLoaded) {
        onLoaded();
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (featuredList.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIdx = (prev + 1) % featuredList.length;
        setTimeout(() => setFeatured(featuredList[nextIdx]), 100);
        return nextIdx;
      });
    }, 8000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [featuredList]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="font-mono text-xs font-bold text-ink/30 uppercase tracking-widest animate-pulse">
          LOADING_KITSU...
        </div>
      </div>
    );
  }

  if (!featured) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="font-mono text-xs font-bold text-ink/40 uppercase tracking-widest">
          NO_KITSU_ASSET_FOUND
        </div>
      </div>
    );
  }

  const activeImage = isMobile ? featured.posterImage : featured.coverImage;

  return (
    <div
      ref={bannerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full h-auto lg:h-full flex flex-col lg:flex-row items-stretch relative overflow-visible lg:overflow-hidden bg-paper"
    >
      {/*
        ==========================================
        SVG FILTER DEFINITIONS (hidden, zero-size)
        ==========================================
      */}
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            {/* Step 1: Desaturate completely */}
            <feColorMatrix type="saturate" values="0" />

            {/* Step 2: Crush contrast */}
            <feComponentTransfer>
              <feFuncR type="linear" slope="3" intercept="-0.8" />
              <feFuncG type="linear" slope="3" intercept="-0.8" />
              <feFuncB type="linear" slope="3" intercept="-0.8" />
            </feComponentTransfer>

            {/* Step 3: Map grayscale luminance to the accent color */}
            <feColorMatrix
              type="matrix"
              values={`
                ${r} 0 0 0 0
                0 ${g} 0 0 0
                0 0 ${b} 0 0
                0 0 0 1 0
              `}
            />
          </filter>
        </defs>
      </svg>

      {/* ===== LEFT COLUMN / BOTTOM STRIP: BRUTALIST METADATA STRIP ===== */}
      <div 
        onClick={() => setIsSliderOpen(!isSliderOpen)}
        onMouseEnter={() => setIsStripHovered(true)}
        onMouseLeave={() => setIsStripHovered(false)}
        className="w-full h-16 lg:w-24 lg:h-full shrink-0 border-b-4 lg:border-b-0 lg:border-r-4 border-ink bg-paper relative overflow-hidden z-20 flex flex-row lg:flex-col justify-center items-center cursor-pointer hover:bg-[#EBE7DF] transition-colors select-none group/strip"
      >
        <style>{`
          @keyframes conveyer-mesh {
            0% {
              background-position: 0px 0px;
            }
            100% {
              background-position: 16px 16px;
            }
          }
          .animate-conveyer-mesh {
            animation: conveyer-mesh 1.8s linear infinite;
          }
        `}</style>

        {/* Intersection mesh brutalist background pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.12] animate-conveyer-mesh"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0 L16 16 M16 0 L0 16' stroke='${svgMeshColor}' stroke-width='1.5' stroke-linecap='square' fill='none'/%3E%3C/svg%3E")`
          }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={featured.id}
            initial={{ opacity: 0, x: isMobile ? -30 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isMobile ? 30 : 60 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 14,
              mass: 0.9
            }}
            style={{
              x: nameStripTranslateX,
              y: nameStripTranslateY,
            }}
            className="w-full h-full relative flex items-center justify-center px-4 lg:px-0"
          >
            {/* Japanese Kanji Title (Background Layer) */}
            {featured.jpTitle && (
              featured.jpTitle.length <= 5 ? (
                <div 
                  className="absolute font-jp font-black text-xl lg:text-[3.5rem] tracking-tighter whitespace-nowrap select-none pointer-events-none"
                  style={{
                    writingMode: isMobile ? 'horizontal-tb' : 'vertical-rl',
                    transform: isMobile ? 'none' : 'rotate(180deg)',
                    color: scheme.hex,
                    opacity: 0.3
                  }}
                >
                  {featured.jpTitle}
                </div>
              ) : (
                <div 
                  className="absolute font-jp font-black text-xs lg:text-[2rem] leading-none tracking-tighter select-none pointer-events-none text-center flex flex-row lg:flex-col justify-center items-center max-w-[50vw] lg:max-w-none lg:h-[75%] break-all"
                  style={{
                    writingMode: isMobile ? 'horizontal-tb' : 'vertical-rl',
                    transform: isMobile ? 'none' : 'rotate(180deg)',
                    color: scheme.hex,
                    opacity: 0.3
                  }}
                >
                  {featured.jpTitle}
                </div>
              )
            )}

            {/* English Title (Foreground Layer) */}
            <div 
              className="absolute font-display text-sm md:text-lg lg:text-[2.25rem] leading-none tracking-tighter select-none uppercase whitespace-nowrap z-10"
              style={{
                writingMode: isMobile ? 'horizontal-tb' : 'vertical-rl',
                transform: isMobile ? 'none' : 'rotate(180deg)',
                color: scheme.hex,
                WebkitTextStroke: isMobile ? '1px var(--color-ink)' : '2px var(--color-ink)' // bold black outline
              }}
            >
              {featured.title}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Click indicator label at bottom of name strip */}
        <div 
          className="absolute right-4 lg:bottom-4 lg:right-auto font-mono text-[9px] font-black uppercase tracking-wider select-none pointer-events-none transition-colors duration-200" 
          style={{ 
            writingMode: isMobile ? 'horizontal-tb' : 'vertical-rl',
            transform: isMobile ? 'none' : 'rotate(180deg)',
            color: isStripHovered ? scheme.hex : 'rgba(10, 10, 10, 0.3)'
          }}
        >
          CLICK TO EXPLORE •
        </div>
      </div>

      {/* ===== RIGHT COLUMN: FULL-BLEED LANDSCAPE DUOTONE BANNER ===== */}
      <div
        className="flex-1 h-auto lg:h-full overflow-visible lg:overflow-hidden flex flex-col relative bg-ink"
        style={{ zIndex: 1 }}
      >
        {/* Banner image container (fills remaining vertical space, or fixed height on mobile to prevent squishing) */}
        <div className="h-[55vh] lg:h-auto lg:flex-1 w-full relative overflow-hidden">
          
          {/* Permanent outer container for GSAP Background Image Scroll Parallax */}
          <div className="w-full h-full relative parallax-bg-img">
            <AnimatePresence mode="wait">
              <motion.div
                key={featured.id}
                variants={baseVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full relative"
                style={{ transformOrigin: 'center' }}
              >
                {/* The landscape banner / portrait poster - TRUE DUOTONE via SVG filter */}
                <motion.img
                  src={activeImage}
                  alt={featured.title}
                  className="w-full h-full object-cover absolute inset-0 select-none pointer-events-none"
                  style={{
                    filter: `url(#${filterId})`,
                    x: imgTranslateX,
                    y: imgTranslateY,
                    scale: 1.08,
                  }}
                />

                {isGlitching && (
                  <>
                    {/* Sliced Chromatic Aberration Glitch Overlay Layer A (Red Shift) */}
                    <motion.div
                      variants={sliceVariantsA}
                      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
                      style={{ transformOrigin: 'center', x: imgTranslateX, y: imgTranslateY, scale: 1.08 }}
                    >
                      <img
                        src={activeImage}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          filter: `url(#${filterId})`,
                        }}
                      />
                    </motion.div>

                    {/* Sliced Chromatic Aberration Glitch Overlay Layer B (Cyan Shift) */}
                    <motion.div
                      variants={sliceVariantsB}
                      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
                      style={{ transformOrigin: 'center', x: imgTranslateX, y: imgTranslateY, scale: 1.08 }}
                    >
                      <img
                        src={activeImage}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          filter: `url(#${filterId})`,
                        }}
                      />
                    </motion.div>

                    {/* Sliced Chromatic Aberration Glitch Overlay Layer C (Yellow Shift) */}
                    <motion.div
                      variants={sliceVariantsC}
                      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
                      style={{ transformOrigin: 'center', x: imgTranslateX, y: imgTranslateY, scale: 1.08 }}
                    >
                      <img
                        src={activeImage}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          filter: `url(#${filterId})`,
                        }}
                      />
                    </motion.div>
                  </>
                )}

                {/* Subtle grain overlay for that screen-printed feel */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
                    mixBlendMode: 'overlay',
                    opacity: 0.4,
                  }}
                />

                {/* Gentle vignette to darken edges */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, transparent 50%, #0A0A0ABB 85%, #0A0A0A 100%)',
                  }}
                />

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Floating Dynamic Studio Hanko Stamp (Outside main AnimatePresence, so GSAP binding is permanent!) */}
          <div className="absolute bottom-4 right-4 lg:bottom-10 lg:right-10 z-20 pointer-events-none parallax-stamp scale-75 lg:scale-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={featured.id}
                initial={{ scale: 0, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0, rotate: 45, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2
                }}
                style={{
                  x: stampTranslateX,
                  y: stampTranslateY,
                }}
              >
                <StudioStamp studio={getStudioForAnime(featured.title)} color={scheme.hex} />
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* ===== EXPLORE DESCRIPTION SLIDER ===== */}
        <AnimatePresence>
          {isSliderOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full bg-paper relative z-30 overflow-hidden shrink-0"
            >
              <div className="w-full border-t-4 border-ink p-6 flex flex-col md:flex-row gap-6 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] select-text">
                {/* Left Side: Metadata and Info */}
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="font-mono text-[10px] font-bold px-2 py-0.5 border uppercase tracking-widest bg-paper"
                        style={{
                          color: scheme.hex,
                          borderColor: scheme.hex,
                          backgroundColor: `${scheme.hex}1A`
                        }}
                      >
                        {featured.subtype}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-ink/40">
                        // RELEASE_YEAR: {featured.year}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-ink/40">
                        // STATUS: {featured.status}
                      </span>
                    </div>
                    
                    <h3 className="font-display text-2xl tracking-tighter text-ink uppercase mb-2">
                      {featured.title}
                    </h3>

                    <p className="font-mono text-[11px] leading-relaxed text-ink/75 uppercase line-clamp-3">
                      {featured.synopsis || 'NO DESCRIPTION FILE RECOVERED FROM THE KITSU API METADATA FEED.'}
                    </p>
                  </div>

                  {/* Studio & Airing Info Row */}
                  <div className="flex gap-6 border-t border-ink/15 pt-3 font-mono text-[10px] font-bold text-ink uppercase tracking-widest">
                    <div>
                      <span className="text-ink/40">STUDIO //</span>{' '}
                      <span style={{ color: scheme.hex }}>{getStudioForAnime(featured.title)}</span>
                    </div>
                    <div>
                      <span className="text-ink/40">SCORE //</span>{' '}
                      <span>{featured.score}%</span>
                    </div>
                    <div>
                      <span className="text-ink/40">EPISODES //</span>{' '}
                      <span>{featured.episodes}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Explorer Link / Action */}
                <div className="flex shrink-0 items-center justify-center md:border-l border-ink/15 md:pl-6">
                  <motion.button
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('explore-anime', { detail: { title: featured.title } })
                      );
                    }}
                    whileHover={{
                      backgroundColor: scheme.hex,
                      boxShadow: `6px 6px 0px ${scheme.hex}`,
                    }}
                    className="px-6 py-4 bg-ink text-paper font-mono text-xs font-black uppercase tracking-widest border-2 border-ink active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2 group cursor-pointer"
                    style={{
                      boxShadow: `4px 4px 0px ${scheme.hex}`,
                    }}
                  >
                    <span>EXPLORE GALLERY</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
