import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Logo from './components/Logo';
import Menu from './components/Menu';
import ThermalText from './components/ThermalText';
import HeroPoster from './components/HeroPoster';
import KineticGallery from './components/KineticGallery';
import './App.css';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenuTag, setShowMenuTag] = useState(false);
  const [isStripPulledOut, setIsStripPulledOut] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [scrollHeight, setScrollHeight] = useState(2000);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  // Ensure refresh starts at the hero and keeps the menu strip visible
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    setShowMenuTag(false);
    setIsStripPulledOut(false);
    setIsMenuOpen(false);
  }, []);

  // Monitor vertical scroll position (which triggers horizontal pagination via GSAP pinning)
  useEffect(() => {
    const handleScroll = () => {
      const pastHero = window.scrollY > 100;
      setShowMenuTag(pastHero);
      if (!pastHero) {
        setIsStripPulledOut(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamically update dummy scroll height when hero loads or container size changes
  useEffect(() => {
    if (!isHeroLoaded) return;
    const updateHeight = () => {
      if (scrollContainerRef.current) {
        const scrollRange = scrollContainerRef.current.scrollWidth - window.innerWidth;
        const mobileMultiplier = isMobile ? 1.8 : 1;
        setScrollHeight(scrollRange * mobileMultiplier + window.innerHeight);
        // Ensure GSAP recalculates bounds after DOM updates to prevent white gaps
        setTimeout(() => ScrollTrigger.refresh(), 50);
      }
    };
    const timer = setTimeout(updateHeight, 100);
    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
    };
  }, [isHeroLoaded, isMobile]);

  // 3D Mouse Parallax Motion Values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for cursor interpolation
  const smoothMouseX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  // Map relative position (-1 to 1) to pixel translations (-25px to 25px) for Main Heading
  const headingTranslateX = useTransform(smoothMouseX, [-1, 1], [-25, 25]);
  const headingTranslateY = useTransform(smoothMouseY, [-1, 1], [-25, 25]);

  // Handle pointer tracking
  const sectionRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return; // Disable parallax on mobile
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Dynamic Neo-Brutalist Selection Colors
  useEffect(() => {
    const neoBrutalistPairs = [
      { bg: '#CCFF00', text: '#3D00FF' }, // Acid Green & Void Purple (complementary/opposite)
      { bg: '#FF007F', text: '#00FF80' }, // Pink & Mint Green
      { bg: '#FF9900', text: '#0055FF' }, // Mango & Royal Blue
      { bg: '#00F0FF', text: '#FF0055' }, // Cyber Cyan & Red/Hot Pink
      { bg: '#FFA6E5', text: '#006600' }, // Bubblegum Pink & Forest Green
      { bg: '#E60000', text: '#00FFCC' }, // Blood Red & Vivid Cyan/Teal
      { bg: '#00FF80', text: '#D000FF' }, // Mint Green & Bright Purple
      { bg: '#3D00FF', text: '#D8FF00' }, // Void Purple & Acid Green
    ];

    let wasSelectionActive = false;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const hasSelection = selection ? selection.toString().trim().length > 0 : false;

      if (hasSelection && !wasSelectionActive) {
        // Just started selecting - pick a random color pair
        const randomPair = neoBrutalistPairs[Math.floor(Math.random() * neoBrutalistPairs.length)];
        document.documentElement.style.setProperty('--selection-bg', randomPair.bg);
        document.documentElement.style.setProperty('--selection-text', randomPair.text);
      }
      
      wasSelectionActive = hasSelection;
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  useEffect(() => {
    if (!isHeroLoaded) return;

    // 1. Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
    });

    // Force scroll position to the hero on init
    lenis.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);

    // Expose lenis globally for component scrollTo interactions
    (window as any).lenis = lenis;

    // Connect Lenis scroll events to ScrollTrigger updates
    lenis.on('scroll', ScrollTrigger.update);

    // Update Lenis via GSAP ticker
    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateLenis);

    // Disable lag smoothing in GSAP to prevent synchronization jitter
    gsap.ticker.lagSmoothing(0);

    // 2. Set up horizontal scroll using GSAP ScrollTrigger timeline (no pinning needed since wrapper is fixed)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: () => {
          const scrollRange = (scrollContainerRef.current?.scrollWidth || 0) - window.innerWidth;
          const mobileMultiplier = window.matchMedia('(max-width: 1023px)').matches ? 1.8 : 1;
          return '+=' + (scrollRange * mobileMultiplier);
        },
        scrub: true, // Perfect alignment with Lenis scroll
        invalidateOnRefresh: true,
      },
    });

    // Horizontal translation of the wrapper
    tl.to(scrollContainerRef.current, {
      x: () => -(scrollContainerRef.current?.scrollWidth || 0) + window.innerWidth,
      ease: 'none',
    }, 0);

    // Parallax: Scroll background image slower to create depth
    tl.to(".parallax-bg-img", {
      x: 150,
      scale: 1.08,
      ease: 'none',
    }, 0);

    // Parallax: Slide the hero heading faster in the opposite direction
    tl.to(".parallax-hero-heading", {
      x: -200,
      ease: 'none',
    }, 0);

    // Parallax: Slide the logo text faster in the opposite direction (same as heading) using left to avoid stacking context
    tl.to(".parallax-logo-text", {
      left: -200,
      ease: 'none',
    }, 0);

    // Parallax: Slide the studio stamp faster in the opposite direction and rotate it
    tl.to(".parallax-stamp", {
      x: -120,
      rotate: -15,
      ease: 'none',
    }, 0);

    // Parallax: Move the gallery heading from center to top-left while the gallery is in view
    gsap.to(".parallax-gallery-heading", {
      x: -380,
      y: -70,
      ease: 'none',
      scrollTrigger: {
        trigger: ".gallery-shell",
        start: "left center",
        end: "right center",
        scrub: true,
        containerAnimation: tl,
      },
    });

    // Synchronize Lenis dimensions with ScrollTrigger updates
    const handleRefresh = () => {
      lenis.resize();
    };
    ScrollTrigger.addEventListener('refresh', handleRefresh);

    return () => {
      tl.kill();
      lenis.destroy();
      (window as any).lenis = undefined;
      gsap.ticker.remove(updateLenis);
      ScrollTrigger.removeEventListener('refresh', handleRefresh);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [isHeroLoaded]);

  const closedWidth = isMobile ? 64 : 96; // 4rem or 6rem
  const openWidth = isMobile ? window.innerWidth * 0.85 : window.innerWidth * 0.75;
  
  const handleSectionClick = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
    if (isStripPulledOut) {
      setIsStripPulledOut(false);
    }
  };

  return (
    <div className="bg-paper text-ink relative">
      
      {/* GLOBAL MENU - Fixed on the left edge */}
      <Menu 
        isOpen={isMenuOpen} 
        setIsOpen={setIsMenuOpen} 
        isHero={!showMenuTag} 
        isStripPulledOut={isStripPulledOut}
        setIsStripPulledOut={setIsStripPulledOut}
        mouseX={mouseX} 
        mouseY={mouseY} 
      />

      {/* Split background to handle overscroll bounce smoothly without affecting layout:
          Left half is white for Hero, Right half is black for Gallery. */}
      <div className="fixed inset-0 z-0 pointer-events-none flex">
        <div className="w-1/2 h-full bg-paper" />
        <div className="w-1/2 h-full bg-ink" />
      </div>

      {/* 
        MAIN CONTENT VIEWPORT 
        This wrapper is fixed to prevent vertical scrolling and containing block conflicts.
      */}
      <div 
        className="fixed top-0 left-0 w-screen h-screen flex overflow-hidden z-10"
      >
        <div ref={scrollContainerRef} className="flex h-screen w-[max-content] gpu-layer relative">
          
          {/* =========================================
              SECTION 1: THE COVER (HERO)
              ========================================= */}
          <section 
            ref={sectionRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleSectionClick}
            className="relative h-screen flex shrink-0 overflow-hidden gpu-layer w-screen"
          >
            {/* Main Layout Area - translated to the right to make room for the Menu */}
            <motion.div 
              className="w-[calc(100vw-4rem)] lg:w-[calc(100vw-6rem)] relative flex flex-col overflow-y-auto lg:overflow-y-hidden h-full"
              animate={{ x: isMenuOpen ? openWidth : closedWidth }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
            >
              {/* Top Navigation Bar / Masthead */}
              <header className="h-[20vh] flex items-stretch z-20 bg-paper relative">
                {/* The Massive Full-Width Logo */}
                <Logo mouseX={mouseX} mouseY={mouseY} />
                {/* Sketchy Bottom Border */}
                <div className="absolute bottom-0 left-0 right-0 h-[4px] border-b-4 border-ink pointer-events-none z-30 sketchy-border" />
              </header>

              {/* Main Hero White Space */}
              <div className="flex-1 relative overflow-visible lg:overflow-hidden">
                
                {/* THE INK-MASKED POSTER + ANIME NAME (lives inside the white space) */}
                <HeroPoster onLoaded={() => setIsHeroLoaded(true)} />
              </div>

              {/* The Main Heading — positioned absolutely over the entire layout,
                  z-40 to sit ABOVE the z-20 header so the SVG pathway is visible */}
              <motion.div 
                style={{
                  x: headingTranslateX,
                  y: headingTranslateY,
                }}
                className="absolute top-[calc(20vh+4rem)] lg:top-[20vh] right-4 md:right-8 z-40 overflow-visible parallax-hero-heading"
              >
                <div className="max-w-[60vw] text-right overflow-visible">
                  <ThermalText text="the GOAT animes" />
                </div>
              </motion.div>
            </motion.div>

            {/* Sketchy Right Border for Hero Section */}
            <div className="absolute top-0 right-0 bottom-0 w-[8px] border-r-8 border-ink pointer-events-none z-50 sketchy-border" />
          </section>

          {/* =========================================
              SECTION 2: THE KINETIC GALLERY & ARCHIVE
              ========================================= */}
          <section 
            onClick={handleSectionClick}
            className="h-screen shrink-0 bg-paper relative overflow-hidden gpu-layer w-screen"
          >
            <KineticGallery />
            {/* Sketchy Right Border for Gallery Section */}
            <div className="absolute top-0 right-0 bottom-0 w-[8px] border-r-8 border-ink pointer-events-none z-50 sketchy-border" />
          </section>

        </div>
      </div>

      {/* Dummy scroll spacer to enable vertical scroll that GSAP maps to horizontal */}
      <div 
        style={{ height: scrollHeight }} 
        className="pointer-events-none w-px z-0" 
      />

      {/* Hidden SVG for global displacement filters */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="manga-sketchy-border" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

export default App;
