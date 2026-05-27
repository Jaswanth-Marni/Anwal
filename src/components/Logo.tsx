import { motion, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';

interface LogoProps {
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
}

export default function Logo({ mouseX, mouseY }: LogoProps) {
  // Set up local spring interpolation for parallax
  const defaultVal = useMotionValue<number>(0);
  const mX = mouseX || defaultVal;
  const mY = mouseY || defaultVal;

  const smoothX = useSpring(mX, { stiffness: 80, damping: 20 });
  const smoothY = useSpring(mY, { stiffness: 80, damping: 20 });

  const logoX = useTransform(smoothX, [-1, 1], [-12, 12]);
  const logoY = useTransform(smoothY, [-1, 1], [-12, 12]);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={{
        hidden: { scale: 1.1, opacity: 0, rotate: -2 },
        visible: { 
          scale: 1, opacity: 1, rotate: 0,
          transition: { type: "spring", stiffness: 500, damping: 15, mass: 1.5, delay: 0.1 }
        },
        hover: {}
      }}
      className="w-full h-full bg-paper flex flex-col cursor-pointer overflow-hidden shrink-0"
    >
      
      <motion.div 
        variants={{
          hidden: { backgroundColor: 'var(--color-acid)' },
          visible: { backgroundColor: 'var(--color-acid)' },
          hover: { backgroundColor: 'var(--color-blood)' }
        }}
        transition={{ duration: 0 }} // Instant color change for brutalism
        className="flex-1 relative flex items-center justify-center overflow-hidden"
      >
        {/* Sketchy Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-[4px] border-b-[4px] border-ink pointer-events-none z-30 sketchy-border" />
        
        <style>{`
          @keyframes conveyer-grid {
            0% {
              background-position: 0px 0px;
            }
            100% {
              background-position: 20px 20px;
            }
          }
          .animate-conveyer-grid {
            animation: conveyer-grid 1.5s linear infinite;
          }
        `}</style>
        
        {/* Background Grid Pattern (Neo-brutalist texture) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:20px_20px] opacity-10 animate-conveyer-grid"></div>
        
        {/* Chaotic Animated Scribble */}
        <div className="absolute inset-0 flex items-center justify-center z-0 opacity-100 mix-blend-difference pointer-events-none">
          <svg viewBox="0 0 1000 300" className="w-[120%] h-[150%] absolute" preserveAspectRatio="none">
            <motion.path
              d="M -50 150 C 100 -50, 150 350, 300 150 C 450 -50, 350 350, 500 100 C 650 -100, 550 400, 700 150 C 850 -50, 800 350, 950 150 C 1100 -50, 900 350, 750 100 C 600 -100, 650 400, 450 150 C 250 -50, 400 350, 200 100 C 0 -100, 150 400, -50 150"
              fill="transparent"
              strokeWidth="24"
              strokeLinecap="round"
              variants={{
                hidden: { pathLength: 0, stroke: "var(--color-paper)" },
                visible: { 
                  pathLength: [0, 1, 0],
                  stroke: "var(--color-paper)",
                  transition: { pathLength: { repeat: Infinity, duration: 4, ease: "easeInOut" } }
                },
                hover: { 
                  stroke: "var(--color-acid)",
                  transition: { 
                    stroke: { duration: 0 } 
                  }
                }
              }}
            />
          </svg>
        </div>
        
        {/* Parallax Content Wrapper (Outer wrapper for GSAP Scroll Parallax) */}
        <motion.div className="relative flex items-center justify-center w-full h-full pointer-events-none parallax-logo-text">
          {/* Inner wrapper for Framer Motion Mouse Parallax using left/top to avoid stacking context */}
          <motion.div
            style={{
              left: logoX,
              top: logoY,
            }}
            className="relative flex items-center justify-center w-full h-full pointer-events-none"
          >
            {/* English Text - Massive & Bold */}
            <motion.h1 
              variants={{
                hidden: { x: 0 },
                visible: { x: 0 },
                hover: { x: -16 } // Equivalent to -translate-x-4
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="font-display text-6xl md:text-8xl lg:text-[8vw] leading-none tracking-tighter text-ink relative z-10"
            >
              ANWAL
            </motion.h1>

            {/* Japanese Translation Overlapping - Vertical Cycle Animation */}
            <motion.h2 
              variants={{
                hidden: { x: "-50%", y: "-50%", scale: 1 },
                visible: { x: "-50%", y: "-50%", scale: 1 },
                hover: { 
                  x: "-50%",
                  y: ["-50%", "-150%", "150%", "-50%"], 
                  scale: 1.1,
                  transition: { 
                    y: { 
                      repeat: Infinity, 
                      duration: 1.5, 
                      ease: "linear",
                      times: [0, 0.33, 0.3301, 1] // Instant jump from top to bottom
                    },
                    scale: { duration: 0.3, ease: "easeOut" }
                  }
                }
              }}
              className="absolute font-jp font-black text-4xl md:text-6xl lg:text-[5vw] leading-none text-paper mix-blend-difference z-20 top-1/2 left-1/2 whitespace-nowrap pointer-events-none"
              style={{ textShadow: '4px 4px 0px #0A0A0A' }}
            >
              アンワル
            </motion.h2>
          </motion.div>
        </motion.div>
        

      </motion.div>

    </motion.div>
  );
}
