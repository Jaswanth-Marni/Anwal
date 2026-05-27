import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger);

const MENU_LINKS = [
  { eng: 'PROLOGUE', jp: 'プロローグ', color: 'var(--color-acid)', img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop' },
  { eng: 'GALLERY', jp: 'ギャラリー', color: 'var(--color-cyber)', img: 'https://images.unsplash.com/photo-1580136608260-4eb11f4b24fe?q=80&w=1200&auto=format&fit=crop' },
  { eng: 'MANIFESTO', jp: 'マニフェスト', color: 'var(--color-blood)', img: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?q=80&w=1200&auto=format&fit=crop' },
  { eng: 'CONTACT', jp: 'コンタクト', color: 'var(--color-mango)', img: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1200&auto=format&fit=crop' },
];

const NEO_COLORS = [
  'var(--color-acid)',
  'var(--color-cyber)',
  'var(--color-blood)',
  'var(--color-void)',
  'var(--color-mango)',
  'var(--color-bubblegum)',
];

interface MenuProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isHero: boolean;
  isStripPulledOut: boolean;
  setIsStripPulledOut: (pulled: boolean) => void;
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
}

export default function Menu({ isOpen, setIsOpen, isHero, isStripPulledOut, setIsStripPulledOut, mouseX, mouseY }: MenuProps) {
  const [hoveredLink, setHoveredLink] = useState<typeof MENU_LINKS[0] | null>(null);
  const [linkColors, setLinkColors] = useState<Record<string, string>>({
    PROLOGUE: 'var(--color-acid)',
    GALLERY: 'var(--color-cyber)',
    MANIFESTO: 'var(--color-blood)',
    CONTACT: 'var(--color-mango)',
  });
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  // Reset pull out state when returning to hero
  useEffect(() => {
    if (isHero) setIsStripPulledOut(false);
  }, [isHero, setIsStripPulledOut]);

  // Auto-close (slide back into the wall) after 5 seconds of inactivity
  useEffect(() => {
    if (isStripPulledOut && !isOpen && !isHero) {
      const timer = setTimeout(() => {
        setIsStripPulledOut(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isStripPulledOut, isOpen, isHero, setIsStripPulledOut]);

  const defaultVal = useMotionValue<number>(0);
  const mX = mouseX || defaultVal;
  const mY = mouseY || defaultVal;

  const smoothX = useSpring(mX, { stiffness: 80, damping: 20 });
  const smoothY = useSpring(mY, { stiffness: 80, damping: 20 });

  // Map relative position (-1 to 1) to pixel translations (-15px to 15px)
  const menuTextX = useTransform(smoothX, [-1, 1], [-15, 15]);
  const menuTextY = useTransform(smoothY, [-1, 1], [-15, 15]);

  const closedWidth = isMobile ? 64 : 96; // 4rem or 6rem
  const openWidth = isMobile ? window.innerWidth * 0.85 : window.innerWidth * 0.75;
  
  const targetWidth = isOpen ? openWidth : closedWidth;
  const isVisible = isHero || isOpen || isStripPulledOut;
  
  const currentShadow = isVisible 
    ? '4px 0px 16px rgba(0,0,0,0.5)' 
    : 'none';

  return (
    <>
      <motion.div 
        initial={false}
        animate={{ 
          width: targetWidth,
          height: '100%',
          top: '0%',
          y: '0%',
          x: isVisible ? 0 : -(closedWidth + 8),
          borderRadius: '0px',
          boxShadow: currentShadow
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30, 
          mass: 1 
        }}
        className="fixed left-0 flex z-50 overflow-hidden"
        style={{ 
          backgroundColor: isOpen ? 'var(--color-ink)' : 'transparent',
          borderRightWidth: 0,
          borderTopWidth: 0,
          borderBottomWidth: 0,
          borderStyle: 'solid',
          borderColor: 'var(--color-ink)'
        }}
      >
      
      {/* 
        THE STRIP (HANDLE)
        This is the 24px wide clickable strip on the far left.
      */}
      <motion.div 
        onClick={() => setIsOpen(!isOpen)}
        initial="mount"
        animate="idle"
        whileHover="hover"
        className="w-16 lg:w-24 h-full shrink-0 flex flex-col justify-between items-center py-8 cursor-pointer relative z-20 overflow-hidden"
        variants={{
          mount: { 
            x: -100, 
            backgroundColor: 'var(--color-void)', 
            color: 'var(--color-acid)' 
          },
          idle: { 
            x: 0, 
            backgroundColor: isOpen ? 'var(--color-ink)' : 'var(--color-void)', 
            color: isOpen ? 'var(--color-paper)' : 'var(--color-acid)' 
          },
          hover: { 
            backgroundColor: isOpen ? 'var(--color-blood)' : 'var(--color-acid)', 
            color: isOpen ? 'var(--color-acid)' : 'var(--color-void)' 
          }
        }}
        transition={{ 
          x: { type: "spring", stiffness: 300, damping: 30 },
          backgroundColor: { duration: 0 }
        }}
      >
        {/* The Edge-to-Edge Animated Chevron (Cone) Pattern Background */}
        <motion.div
          className="absolute inset-0 w-full h-[200%] z-0"
          style={{
            WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='100' height='48' viewBox='0 0 100 48' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 48 L50 24 L50 0 L0 24 Z M100 48 L50 24 L50 0 L100 24 Z' fill='black'/%3E%3C/svg%3E")`,
            WebkitMaskSize: '100% 48px',
            backgroundColor: 'currentColor'
          }}
          variants={{
            mount: { opacity: 0 },
            idle: { y: ["0%", "-50%"], opacity: 0.15 },
            hover: { y: ["0%", "-50%"], opacity: 1 }
          }}
          transition={{
            y: { repeat: Infinity, duration: 6, ease: "linear" },
            opacity: { duration: 0.3 }
          }}
        />

        {/* 
          ANIMATED SPLIT TEXT 
          Japanese starts huge and dimmed in the center, English starts prominent in the center.
          On hover, they split to opposite ends with a slight jiggle.
        */}
        
        {/* Japanese Text (Background) */}
        <motion.div 
          className="absolute font-jp font-black text-xl md:text-3xl lg:text-4xl whitespace-nowrap pointer-events-none text-white mix-blend-difference z-10"
          variants={{
            mount: { top: "50%", left: "50%", x: "-50%", y: "-50%", opacity: 0, rotate: -90, scale: 2 },
            idle: { top: "50%", left: "50%", x: "-50%", y: "-50%", opacity: 0.15, rotate: -90, scale: 1.5 },
            hover: { top: "85%", left: "50%", x: "-50%", y: "-50%", opacity: 0.8, rotate: -85, scale: 1 }
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.div style={{ x: menuTextX, y: menuTextY }}>
            {isOpen ? '閉じる' : 'メニュー'}
          </motion.div>
        </motion.div>

        {/* English Text (Foreground) */}
        <motion.div 
          className="absolute font-display text-xl md:text-3xl lg:text-4xl whitespace-nowrap pointer-events-none text-white mix-blend-difference z-10"
          variants={{
            mount: { top: "50%", left: "50%", x: "-50%", y: "-50%", opacity: 0, letterSpacing: "0.1em", rotate: -90 },
            idle: { top: "50%", left: "50%", x: "-50%", y: "-50%", opacity: 1, letterSpacing: "0.1em", rotate: -90 },
            hover: { top: "15%", left: "50%", x: "-50%", y: "-50%", opacity: 1, letterSpacing: "0.3em", rotate: -95 }
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <motion.div style={{ x: menuTextX, y: menuTextY }}>
            {isOpen ? 'CLOSE' : 'MENU'}
          </motion.div>
        </motion.div>

        {/* Sketchy Right Border for Menu Strip Handle */}
        <div className="absolute top-0 right-0 bottom-0 w-[4px] border-r-4 border-ink pointer-events-none z-30 sketchy-border" />
      </motion.div>

      {/* 
        EXPANDED CONTENT (NEO-BRUTALIST SVG STRETCH)
      */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }} // Smoothed out entrance, removed skew to prevent lag
            className="flex-1 h-full flex flex-col bg-paper relative overflow-hidden p-8"
          >
            {/* Massive Halftone / Manga Screentone Background */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: `radial-gradient(var(--color-ink) 25%, transparent 28%), radial-gradient(var(--color-ink) 25%, transparent 28%)`,
                backgroundPosition: `0 0, 10px 10px`,
                backgroundSize: `20px 20px`
              }}
            ></div>

            {/* The SVG Typographic Stretch Links */}
            {MENU_LINKS.map((link, i) => {
              const isHovered = hoveredLink?.eng === link.eng;
              const hasHover = hoveredLink !== null;
              const currentColor = linkColors[link.eng] || link.color;

              return (
                <motion.a 
                  href="#"
                  key={link.eng}
                  onHoverStart={() => {
                    setHoveredLink(link);
                    const current = linkColors[link.eng] || link.color;
                    const filtered = NEO_COLORS.filter(c => c !== current);
                    const randomColor = filtered[Math.floor(Math.random() * filtered.length)];
                    setLinkColors(prev => ({
                      ...prev,
                      [link.eng]: randomColor
                    }));
                  }}
                  onHoverEnd={() => setHoveredLink(null)}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsOpen(false);
                    if (link.eng === 'PROLOGUE') {
                      if ((window as any).lenis) {
                        (window as any).lenis.scrollTo(0);
                      }
                    } else if (link.eng === 'GALLERY') {
                      if ((window as any).lenis) {
                        (window as any).lenis.scrollTo(window.innerWidth);
                      }
                    }
                  }}
                  animate={{
                    flex: isHovered ? 6 : hasHover ? 1 : 2 
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="w-full relative flex items-center justify-center cursor-pointer group"
                >
                  
                  {/* The SVG that physically stretches the vector text */}
                  <motion.svg 
                    width="100%" 
                    height="100%" 
                    viewBox="0 0 1000 120" 
                    preserveAspectRatio="none" 
                    className="overflow-visible pointer-events-none relative z-10 origin-center"
                    initial={{ 
                      opacity: 0, 
                      x: i % 2 === 0 ? -300 : 300, // Alternate sides
                      scaleY: 0, // Start completely flat
                      skewX: i % 2 === 0 ? -30 : 30 
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      scaleY: 1,
                      skewX: 0,
                      rotate: isHovered ? (i % 2 === 0 ? 1.5 : -1.5) : (hasHover ? (i % 2 === 0 ? -1 : 1) : 0),
                      scale: isHovered ? 1.02 : (hasHover ? 0.98 : 1)
                    }}
                    transition={{ 
                      type: "spring", stiffness: 500, damping: 15, // Default for hover interactions
                      x: { delay: i * 0.07 + 0.15, type: "spring", stiffness: 400, damping: 25 },
                      scaleY: { delay: i * 0.07 + 0.15, type: "spring", stiffness: 400, damping: 25 },
                      skewX: { delay: i * 0.07 + 0.15, type: "spring", stiffness: 400, damping: 25 },
                      opacity: { delay: i * 0.07 + 0.15, duration: 0.1 }
                    }}
                  >
                    {/* Brutalist Hard Black Offset Shadow */}
                    <motion.text 
                      x="10" 
                      y="75" 
                      dominantBaseline="middle" 
                      textLength="1000"
                      lengthAdjust="spacingAndGlyphs"
                      fontSize="115" 
                      className="font-display uppercase" 
                      animate={{
                        fill: isHovered ? 'var(--color-ink)' : 'transparent',
                        opacity: isHovered ? 1 : 0
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {link.eng}
                    </motion.text>

                    {/* Main Vector Text with Thick Stroke */}
                    <motion.text 
                      x="0" 
                      y="65" 
                      dominantBaseline="middle" 
                      textLength="1000"
                      lengthAdjust="spacingAndGlyphs"
                      fontSize="115" 
                      className="font-display uppercase" 
                      animate={{
                        fill: isHovered ? currentColor : (!hasHover ? 'var(--color-ink)' : 'transparent'),
                        stroke: 'var(--color-ink)',
                        strokeWidth: isHovered ? 6 : (hasHover && !isHovered ? 3 : 0),
                        opacity: hasHover && !isHovered ? 0.3 : 1
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {link.eng}
                    </motion.text>
                  </motion.svg>

                  {/* Japanese Translation Brutalist Badge Overlay */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: 10 }}
                        animate={{ opacity: 1, scale: 1, rotate: -2 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="absolute right-12 bottom-12 z-20 px-6 py-2 border-[4px] border-ink shadow-[8px_8px_0px_var(--color-ink)] pointer-events-none sketchy-border"
                        style={{ backgroundColor: currentColor }}
                      >
                        <span className="font-jp font-black text-4xl text-ink tracking-widest">
                          {link.jp}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.a>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sketchy Right Border for sliding menu drawer */}
      <div className="absolute top-0 right-0 bottom-0 w-[4px] border-r-4 border-ink pointer-events-none z-50 sketchy-border" />
    </motion.div>

    {/* THE RED FABRIC PULL TAG */}
    <AnimatePresence>
      {!isHero && !isOpen && !isStripPulledOut && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed -left-[250px] top-[40%] -translate-y-1/2 z-[60] flex items-center shadow-2xl"
          drag="x"
          dragConstraints={{ left: 0, right: 80 }}
          dragElastic={0}
          onDragEnd={(_, info) => {
            if (info.offset.x > 30) {
              setIsStripPulledOut(true);
            }
          }}
          onClick={() => setIsStripPulledOut(true)}
        >
          {/* Tag visual */}
          <div className="w-[300px] bg-[#ff003c] border-2 border-l-0 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] py-8 pr-3 flex justify-end cursor-grab active:cursor-grabbing rounded-r-md relative overflow-hidden sketchy-border">
            <span className="font-mono text-black font-black uppercase text-sm tracking-widest relative z-10" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              PULL
            </span>
            {/* Fabric texture overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-multiply" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1h2v2H1z' fill='%23000' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize: '4px' }}></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
}
