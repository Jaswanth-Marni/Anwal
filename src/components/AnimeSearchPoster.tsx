import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Star, Calendar, Tv } from 'lucide-react';
import { fetchTopAnime, searchAnime, type NormalizedAnime } from '../api/kitsu';

const ACCENT_COLORS = [
  'var(--color-blood)',
  'var(--color-cyber)',
  'var(--color-mango)',
  'var(--color-bubblegum)',
  'var(--color-acid)',
];

function accentForIndex(i: number) {
  return ACCENT_COLORS[i % ACCENT_COLORS.length];
}

export default function AnimeSearchPoster() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animeStack, setAnimeStack] = useState<NormalizedAnime[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-populate with Kitsu top list on mount (cached via shared service)
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      const results = await fetchTopAnime();
      if (!isMounted) return;

      // Only keep items that have a poster image for the card layout
      const withPoster = results.filter((a) => a.posterImage);
      setAnimeStack(withPoster.slice(0, 8));
      setIsLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for external "explore-anime" event to programmatically search and scroll
  useEffect(() => {
    const handleExplore = async (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string }>;
      const targetTitle = customEvent.detail.title;
      if (!targetTitle) return;

      setQuery(targetTitle);
      setIsLoading(true);
      setActiveIndex(0);

      // Perform Kitsu search
      const results = await searchAnime(targetTitle);
      const withPoster = results.filter((a) => a.posterImage);
      setAnimeStack(withPoster);
      setIsLoading(false);

      // Smoothly scroll the page vertically to slide horizontally via GSAP ScrollTrigger
      if ((window as any).lenis) {
        (window as any).lenis.scrollTo(window.innerWidth * 1.05, { duration: 1.5 });
      } else {
        window.scrollTo({
          top: window.innerWidth * 1.05,
          behavior: 'smooth',
        });
      }
    };

    window.addEventListener('explore-anime', handleExplore);
    return () => {
      window.removeEventListener('explore-anime', handleExplore);
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Cancel any pending debounce
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    setIsLoading(true);
    setActiveIndex(0);

    // Use the real Kitsu search endpoint
    const results = await searchAnime(query);
    const withPoster = results.filter((a) => a.posterImage);
    setAnimeStack(withPoster);
    setIsLoading(false);
  };

  const handleNext = () => {
    if (animeStack.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % animeStack.length);
  };

  return (
    <div className="w-[32vw] h-[75vh] flex flex-col justify-between pointer-events-auto select-none relative z-40">
      
      {/* 1. BRUTALIST SEARCH BAR */}
      <form onSubmit={handleSearch} className="w-full relative flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold tracking-widest text-ink">
          <span>[ ARCHIVE // DATABASE_SEARCH ]</span>
          {isLoading && <span className="animate-pulse text-blood">QUERYING_KITSU...</span>}
        </div>
        <div className="relative flex border-[4px] border-ink bg-paper shadow-[4px_4px_0px_var(--color-ink)] focus-within:shadow-[8px_8px_0px_var(--color-ink)] transition-all overflow-hidden">
          <input 
            type="text"
            placeholder="INPUT TARGET TITLE..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-transparent text-sm font-mono font-bold tracking-wider outline-none text-ink placeholder-ink/40 uppercase"
          />
          <button 
            type="submit" 
            aria-label="Search anime"
            className="px-4 border-l-[4px] border-ink bg-ink text-paper hover:bg-blood hover:text-paper active:translate-x-[2px] active:translate-y-[2px] transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* 2. THE STAMPING DECK CAROUSEL */}
      <div className="flex-1 w-full relative flex items-center justify-center mt-6 mb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Brutalist Hard Loading */}
            <div className="w-16 h-16 border-[6px] border-ink border-t-blood rounded-full animate-spin"></div>
            <div className="font-mono text-sm font-bold tracking-widest uppercase">LOADING ASSETS...</div>
          </div>
        ) : animeStack.length > 0 ? (
          <div className="relative w-full h-[52vh] flex items-center justify-center" style={{ perspective: "1500px" }}>
            <AnimatePresence>
              {animeStack.map((anime, i) => {
                // Calculate position relative to active index
                const stackIndex = (i - activeIndex + animeStack.length) % animeStack.length;
                const isActive = stackIndex === 0;

                // Stack rendering offsets (gives papers scattered on a desk feel)
                const rotateDeg = isActive ? 0 : (stackIndex === 1 ? 6 : stackIndex === 2 ? -6 : 3);
                const xOffset = isActive ? 0 : (stackIndex === 1 ? 15 : stackIndex === 2 ? -15 : 0);
                const yOffset = isActive ? 0 : (stackIndex === 1 ? 10 : stackIndex === 2 ? 15 : 20);
                const scaleVal = isActive ? 1 : 0.95 - (stackIndex * 0.03);
                const zIndexVal = animeStack.length - stackIndex;

                // Hidden cards should not be clickable or visible
                if (stackIndex > 2) return null;

                const accent = accentForIndex(i);

                return (
                  <motion.div
                    key={anime.id}
                    className="absolute w-[24vw] h-[48vh] bg-paper border-[5px] border-ink p-3 flex flex-col justify-between shadow-[8px_8px_0px_var(--color-ink)] origin-center overflow-hidden"
                    style={{
                      zIndex: zIndexVal,
                      boxShadow: isActive ? `12px 12px 0px ${accent}, 12px 12px 0px 4px var(--color-ink)` : '6px 6px 0px var(--color-ink)'
                    }}
                    initial={{ scale: 0.8, opacity: 0, y: 100, rotate: -20 }}
                    animate={{ 
                      scale: scaleVal, 
                      opacity: 1, 
                      x: xOffset,
                      y: yOffset,
                      rotate: rotateDeg,
                    }}
                    exit={{ 
                      x: 400, 
                      y: -100, 
                      rotate: 45, 
                      opacity: 0,
                      scale: 0.8,
                      transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } 
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  >
                    {/* The Poster Image */}
                    <div className="w-full h-[65%] border-[3px] border-ink relative overflow-hidden group/img">
                      {anime.posterImage ? (
                        <img 
                          src={anime.posterImage} 
                          alt={anime.title} 
                          className="w-full h-full object-cover filter grayscale contrast-125 hover:grayscale-0 transition-all duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-ink flex items-center justify-center">
                          <span className="font-mono text-xs text-paper font-bold">[ NO_IMAGE ]</span>
                        </div>
                      )}
                      
                      {/* Heavy Japanese / Kanji Overlay Tag */}
                      {anime.jpTitle && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-ink text-paper text-[10px] font-jp font-black tracking-widest select-none pointer-events-none">
                          {anime.jpTitle.substring(0, 5)}
                        </div>
                      )}

                      {/* Accent Corner Tag */}
                      <div 
                        className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center border-t-[3px] border-l-[3px] border-ink text-ink font-bold font-mono text-xs select-none"
                        style={{ backgroundColor: accent }}
                      >
                        ANM
                      </div>
                    </div>

                    {/* Metadata Area */}
                    <div className="flex-1 flex flex-col justify-between mt-3">
                      <div>
                        {/* Title & English Subtitle */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-lg leading-none tracking-tight text-ink uppercase truncate">
                            {anime.title}
                          </h3>
                          {anime.score > 0 && (
                            <div className="flex items-center gap-1 bg-ink text-paper px-1.5 py-0.5 font-mono text-[9px] font-bold">
                              <Star className="w-2.5 h-2.5 fill-current text-mango" />
                              <span>{anime.score}%</span>
                            </div>
                          )}
                        </div>
                        <p className="font-mono text-[9px] text-ink/60 uppercase tracking-wider mt-1 truncate">
                          {anime.englishTitle || anime.title}
                        </p>
                      </div>

                      {/* Stamped Tag List */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {anime.year > 0 && (
                          <span className="flex items-center gap-1 font-mono text-[9px] font-bold border-2 border-ink px-1.5 py-0.5 bg-paper shadow-[2px_2px_0px_var(--color-ink)]">
                            <Calendar className="w-2.5 h-2.5" />
                            {anime.year}
                          </span>
                        )}
                        {anime.episodes > 0 && (
                          <span className="flex items-center gap-1 font-mono text-[9px] font-bold border-2 border-ink px-1.5 py-0.5 bg-paper shadow-[2px_2px_0px_var(--color-ink)]">
                            <Tv className="w-2.5 h-2.5" />
                            {anime.episodes} EP
                          </span>
                        )}
                        {anime.tags.slice(0, 1).map((tag) => (
                          <span 
                            key={tag}
                            className="font-mono text-[9px] font-bold border-2 border-ink px-1.5 py-0.5 shadow-[2px_2px_0px_var(--color-ink)]"
                            style={{ backgroundColor: accent }}
                          >
                            {tag.toUpperCase()}
                          </span>
                        ))}
                      </div>

                      {/* Synopsis */}
                      <div className="mt-2 pt-2 border-t-2 border-ink/10 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-ink/50 uppercase">DB_REF // #{anime.id}</span>
                        <span className="font-bold text-ink uppercase tracking-tighter">{anime.status}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-[24vw] h-[48vh] border-[5px] border-ink border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center">
            <span className="font-mono text-sm font-bold text-ink/40 uppercase mb-2">[ DB_EMPTY_QUERY ]</span>
            <p className="font-mono text-[10px] text-ink/50 uppercase leading-relaxed">
              Target query yielded no assets. Search another title (e.g. Evangelion, Akira, Bebop, Berserk).
            </p>
          </div>
        )}
      </div>

      {/* 3. CAROUSEL TRIGGER BUTTON */}
      {animeStack.length > 0 && !isLoading && (
        <button
          onClick={handleNext}
          className="w-full py-4 border-[4px] border-ink bg-ink text-paper text-sm font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-blood hover:text-paper shadow-[4px_4px_0px_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
        >
          <span>EXECUTE NEXT_ASSET</span>
          <ChevronRight className="w-5 h-5 animate-pulse" />
        </button>
      )}
      
    </div>
  );
}
