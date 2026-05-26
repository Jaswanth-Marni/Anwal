import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Image as ImageIcon, LayoutTemplate, Download, X, BookOpen } from 'lucide-react';
import { fetchTopAnime, searchAnime, type NormalizedAnime } from '../api/kitsu';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import GalleryShaderText from './GalleryShaderText';
// @ts-ignore
import ImageTracer from 'imagetracerjs';

const FUNKY_HIGHLIGHT_COLORS = [
  { name: 'ACID GREEN', hex: '#39FF14' },
  { name: 'CYBER CYAN', hex: '#00F0FF' },
  { name: 'BUBBLEGUM',   hex: '#FF007F' },
  { name: 'MANGO ORANGE', hex: '#FF8C00' },
  { name: 'BLOOD RED',   hex: '#E60000' },
  { name: 'VOID PURPLE', hex: '#9B59FF' },
  { name: 'NEON YELLOW', hex: '#FFEA00' }
];

const MATCHING_DARK_COLORS = [
  { name: 'PURE BLACK', hex: '#000000' },
  { name: 'DARK INK',   hex: '#0F172A' },
  { name: 'OBSIDIAN',   hex: '#0D0D0D' },
  { name: 'DARK VOID',  hex: '#0B031A' },
  { name: 'DARK BLOOD', hex: '#1A0003' },
  { name: 'DARK FOREST', hex: '#001A0A' },
  { name: 'DEEP NAVY',  hex: '#000B1A' }
];

const MANGA_POLYGONS = [
  "polygon(0% 0%, 100% 0%, 88% 100%, 0% 100%)",
  "polygon(12% 0%, 100% 0%, 100% 100%, 0% 100%)",
  "polygon(10% 0%, 95% 0%, 85% 100%, 0% 100%)",
  "polygon(0% 0%, 90% 0%, 100% 100%, 10% 100%)"
];

const HOVERED_POLYGON = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";

export default function KineticGallery() {
  const [baseCatalog, setBaseCatalog] = useState<NormalizedAnime[]>([]);
  const [catalog, setCatalog] = useState<NormalizedAnime[]>([]);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageType, setImageType] = useState<'poster' | 'cover'>('poster');
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [accentColor, setAccentColor] = useState<string>('#3D00FF');
  const [hoveredThumbIndex, setHoveredThumbIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'bento' | 'manga'>('bento');
  const [hoveredMangaIndex, setHoveredMangaIndex] = useState<number | null>(null);

  // Actual pixel dimensions the image occupies after layout
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const mobileThumbRef = useRef<HTMLDivElement>(null);
  const mobileMangaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  // Sync selected thumbnail to center of view on mobile
  useEffect(() => {
    if (isMobile && mobileThumbRef.current) {
      const activeEl = mobileThumbRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [currentIndex, isMobile]);

  // Sync selected manga panel to center of view on mobile
  useEffect(() => {
    if (isMobile && viewMode === 'manga' && mobileMangaRef.current) {
      const activeEl = mobileMangaRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [currentIndex, isMobile, viewMode]);

  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const borderX = useMotionValue(0);
  const borderY = useMotionValue(0);

  useEffect(() => {
    borderX.set(imgWidth);
  }, [imgWidth]);

  useEffect(() => {
    borderY.set(imgHeight);
  }, [imgHeight]);

  const borderOffsetX = useMotionValue(0);
  const borderOffsetY = useMotionValue(0);

  const springOffsetX = useSpring(borderOffsetX, { stiffness: 220, damping: 18 });
  const springOffsetY = useSpring(borderOffsetY, { stiffness: 220, damping: 18 });

  const dynamicBorderX = useTransform(
    [borderX, springOffsetX],
    ([latestX, latestOffset]) => Number(latestX) + Number(latestOffset)
  );
  const dynamicBorderY = useTransform(
    [borderY, springOffsetY],
    ([latestY, latestOffset]) => Number(latestY) + Number(latestOffset)
  );

  const dynamicBottomHeight = useTransform(
    [borderY, springOffsetY],
    ([latestY, latestOffset]) => {
      if (!galleryRef.current) return 0;
      const containerH = galleryRef.current.clientHeight;
      const borderYVal = Number(latestY) + Number(latestOffset);
      return Math.max(0, containerH - borderYVal);
    }
  );

  const triggerImpact = () => {
    animate(borderOffsetX, [0, -18, 14, -9, 5, -2, 0], {
      duration: 0.65,
      ease: "easeInOut"
    });
    animate(borderOffsetY, [0, -14, 11, -7, 4, -2, 0], {
      duration: 0.65,
      ease: "easeInOut"
    });
  };

  const handleGalleryMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode === 'manga') return;
    if (!galleryRef.current) return;

    const rect = galleryRef.current.getBoundingClientRect();
    const mouseXRel = e.clientX - rect.left;
    const mouseYRel = e.clientY - rect.top;

    const curBorderX = borderX.get();
    const curBorderY = borderY.get();

    // 1. Vertical Border Magnetic Pull
    const distToBorderX = mouseXRel - curBorderX;
    if (Math.abs(distToBorderX) < 100) {
      const strength = 1 - Math.abs(distToBorderX) / 100;
      borderOffsetX.set(distToBorderX * strength * 0.25);
    } else {
      borderOffsetX.set(0);
    }

    // 2. Horizontal Border Magnetic Pull (only under the image)
    if (mouseXRel < curBorderX) {
      const distToBorderY = mouseYRel - curBorderY;
      if (Math.abs(distToBorderY) < 100) {
        const strength = 1 - Math.abs(distToBorderY) / 100;
        borderOffsetY.set(distToBorderY * strength * 0.25);
      } else {
        borderOffsetY.set(0);
      }
    } else {
      borderOffsetY.set(0);
    }
  };

  const handleGalleryMouseLeave = () => {
    borderOffsetX.set(0);
    borderOffsetY.set(0);
  };


  // Multi-format download states
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [svgTimer, setSvgTimer] = useState<number>(0);

  // Custom Duotone states
  const [isDuotonePopupOpen, setIsDuotonePopupOpen] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('#39FF14');
  const [selectedShadowColor, setSelectedShadowColor] = useState('#000000');

  const handleDownload = async (format: 'raw' | 'png' | 'duotone' | 'svg') => {
    if (!featured || isDownloading) return;
    setIsDownloading(true);

    const title = featured.title || 'anime';
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const suffix = imageType === 'cover' ? 'banner' : 'poster';
    const baseFilename = `${cleanTitle}-${suffix}`;

    // Get the base proxy URL
    const proxyUrl = currentSrc ? `https://wsrv.nl/?url=${encodeURIComponent(currentSrc)}` : '';

    if (!proxyUrl) {
      setIsDownloading(false);
      return;
    }

    try {
      if (format === 'raw') {
        setDownloadStatus('FETCHING...');
        const response = await fetch(proxyUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseFilename}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'png' || format === 'duotone') {
        setDownloadStatus('DRAWING...');
        
        // Create an offscreen image to load the source in full size
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load image for canvas export'));
          img.src = proxyUrl;
        });

        // Set up canvas to natural dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');

        ctx.drawImage(img, 0, 0);

        if (format === 'duotone') {
          setDownloadStatus('FILTERING...');
          // Apply the custom duotone algorithm using chosen highlight and shadow colors
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Parse highlight color
          const hHex = selectedHighlightColor;
          const hR = parseInt(hHex.slice(1, 3), 16);
          const hG = parseInt(hHex.slice(3, 5), 16);
          const hB = parseInt(hHex.slice(5, 7), 16);

          // Parse shadow color
          const sHex = selectedShadowColor;
          const sR = parseInt(sHex.slice(1, 3), 16);
          const sG = parseInt(sHex.slice(3, 5), 16);
          const sB = parseInt(sHex.slice(5, 7), 16);

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            // 1. Grayscale (Luminance)
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // 2. Contrast Crush: slope=3, intercept=-0.8
            let val = (gray / 255) * 3 - 0.8;
            val = Math.max(0, Math.min(1, val));

            // 3. Interpolate between shadow and highlight
            data[i] = Math.round(sR + val * (hR - sR));
            data[i+1] = Math.round(sG + val * (hG - sG));
            data[i+2] = Math.round(sB + val * (hB - sB));
          }
          ctx.putImageData(imgData, 0, 0);
        }

        setDownloadStatus('EXPORTING...');
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Failed to export canvas to PNG');

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = format === 'duotone' ? `${baseFilename}-duotone.png` : `${baseFilename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'svg') {
        setDownloadStatus('TRACING...');
        setSvgTimer(0);
        
        const timerInterval = setInterval(() => {
          setSvgTimer(prev => prev + 1);
        }, 100);

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image for SVG export'));
            img.src = proxyUrl;
          });

          // Roll back size constraint, use full natural resolution for highest detail
          const w = img.naturalWidth;
          const h = img.naturalHeight;

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get 2D context');

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);

          // Delegate synchronous tracing to a Web Worker so the UI doesn't freeze and the timer can tick
          const svgString = await new Promise<string>((resolve, reject) => {
            const workerCode = `
              importScripts('https://unpkg.com/imagetracerjs@1.2.6/imagetracer_v1.2.6.js');
              self.onmessage = function(e) {
                try {
                  const { imgData, options } = e.data;
                  const svgString = self.ImageTracer.imagedataToSVG(imgData, options);
                  self.postMessage({ success: true, svgString });
                } catch (err) {
                  self.postMessage({ success: false, error: err.message });
                }
              };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            worker.onmessage = (e) => {
              if (e.data.success) {
                resolve(e.data.svgString);
              } else {
                reject(new Error(e.data.error));
              }
              worker.terminate();
            };
            
            worker.onerror = (err) => {
              reject(err);
              worker.terminate();
            };

            worker.postMessage({
              imgData,
              options: {
                numberofcolors: 64, // significantly higher color detail
                pathomit: 0,        // do not omit small paths for maximum detail
                qtres: 0.1,         // very precise curves
                ltres: 0.1,
                colorquantcycles: 3,
                scale: 1,
                viewbox: true
              }
            });
          });

          clearInterval(timerInterval);

          const blob = new Blob([svgString], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${baseFilename}.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          clearInterval(timerInterval);
          throw err;
        }
      }
    } catch (error) {
      console.error('Download failed', error);
      // Fallback
      window.open(proxyUrl, '_blank');
    }

    setIsDownloading(false);
    setDownloadStatus(null);
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const list = await fetchTopAnime();
      if (!isMounted) return;
      setBaseCatalog(list);
      setCatalog(list);
    };
    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (query.trim() === '') {
      setCatalog(baseCatalog);
      setCurrentIndex(0);
    }
  }, [query, baseCatalog]);

  useEffect(() => {
    const handleExplore = async (e: any) => {
      const title = e.detail?.title;
      if (title) {
        setQuery(title);
        setIsSearching(true);
        const results = await searchAnime(title);
        setCatalog(results);
        setCurrentIndex(0);
        setIsSearching(false);
        
        // Smooth scroll to gallery
        if ((window as any).lenis) {
          (window as any).lenis.scrollTo(window.innerWidth, { duration: 1.2 });
        }
      }
    };
    window.addEventListener('explore-anime', handleExplore);
    return () => window.removeEventListener('explore-anime', handleExplore);
  }, []);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      setCatalog(baseCatalog);
      setCurrentIndex(0);
      return;
    }
    setIsSearching(true);
    const results = await searchAnime(term);
    setCatalog(results);
    setCurrentIndex(0);
    setIsSearching(false);
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (viewMode === 'manga') return;
    
    if (galleryRef.current) {
      const rect = galleryRef.current.getBoundingClientRect();
      if (rect.left > 10) return;
    }
    
    if ((e.target as HTMLElement).closest('.thumbnail-list')) {
      e.stopPropagation();
      return;
    }
    
    e.stopPropagation();
    if (wheelTimeout.current) return;

    if (e.deltaY > 0) {
      setCurrentIndex((prev) => Math.min(prev + 1, catalog.length - 1));
    } else if (e.deltaY < 0) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }

    wheelTimeout.current = setTimeout(() => {
      wheelTimeout.current = null;
    }, 500);
  }, [catalog.length, viewMode]);

  const featured = catalog[currentIndex];
  
  const currentSrc = featured 
    ? (imageType === 'cover' ? (featured.coverImage || featured.posterImage) : featured.posterImage) 
    : '';

  // Ratio is used for dimension calculations in computeImageDimensions

  // Calculate the image's rendered dimensions based on the container
  const computeImageDimensions = useCallback((natW: number, natH: number) => {
    if (!galleryRef.current) return;
    const containerW = galleryRef.current.clientWidth;
    const containerH = galleryRef.current.clientHeight;
    const ratio = natW / natH;

    let renderedW: number;
    let renderedH: number;

    if (ratio > 1.2) {
      // Landscape: image spans full width, height is proportional
      renderedW = Math.min(natW, containerW);
      renderedH = renderedW / ratio;
      // If too tall, cap height
      if (renderedH > containerH * 0.65) {
        renderedH = containerH * 0.65;
        renderedW = renderedH * ratio;
      }

      // If there is a small gap on the right that is too narrow for search/thumbnails (~280px),
      // scale the banner to occupy the full width of the container.
      const rightGap = containerW - renderedW;
      const minRightPanelWidth = 280;
      if (rightGap > 0 && rightGap < minRightPanelWidth) {
        renderedW = containerW;
        renderedH = renderedW / ratio;
        // Re-cap height to make sure we don't cover everything
        if (renderedH > containerH * 0.65) {
          renderedH = containerH * 0.65;
        }
      }
    } else if (ratio < 0.85) {
      // Portrait: image spans full height, width is proportional
      renderedH = Math.min(natH, containerH);
      renderedW = renderedH * ratio;
      // If too wide, cap width
      if (renderedW > containerW * 0.6) {
        renderedW = containerW * 0.6;
        renderedH = renderedW / ratio;
      }

      // If there is a small gap at the bottom that is too narrow for metadata (~220px),
      // scale the poster to fill the full height of the container.
      const bottomGap = containerH - renderedH;
      const minMetaHeight = 220;
      if (bottomGap > 0 && bottomGap < minMetaHeight) {
        renderedH = containerH;
        renderedW = renderedH * ratio;
        // Cap width to preserve layout balance
        if (renderedW > containerW * 0.6) {
          renderedW = containerW * 0.6;
        }
      }
    } else {
      // Square-ish: fit to height, let width be natural
      renderedH = Math.min(natH, containerH * 0.7);
      renderedW = renderedH * ratio;
      if (renderedW > containerW * 0.55) {
        renderedW = containerW * 0.55;
        renderedH = renderedW / ratio;
      }

      // If the bottom space is too small for metadata (~220px)
      const bottomGap = containerH - renderedH;
      const minMetaHeight = 220;
      if (bottomGap > 0 && bottomGap < minMetaHeight) {
        renderedH = containerH;
        renderedW = renderedH * ratio;
        if (renderedW > containerW * 0.55) {
          renderedW = containerW * 0.55;
        }
      }
    }

    setImgWidth(Math.round(renderedW));
    setImgHeight(Math.round(renderedH));
    setImageRatio(ratio);
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const natW = e.currentTarget.naturalWidth;
    const natH = e.currentTarget.naturalHeight;
    computeImageDimensions(natW, natH);

    const randomColor = FUNKY_HIGHLIGHT_COLORS[Math.floor(Math.random() * FUNKY_HIGHLIGHT_COLORS.length)];
    setAccentColor(randomColor.hex);
    triggerImpact();
  }, [computeImageDimensions]);

  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current && imgRef.current.naturalWidth) {
        computeImageDimensions(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [computeImageDimensions]);

  const imageLoaded = imageRatio !== null && imgWidth > 0 && imgHeight > 0;

  const renderSearchBar = (className = '') => (
    <form onSubmit={handleSearch} className={`flex border-white bg-ink shrink-0 items-stretch ${className}`}>
      {/* View Mode Toggle */}
      <button 
        type="button"
        onClick={() => setViewMode(prev => prev === 'bento' ? 'manga' : 'bento')}
        className="px-4 bg-acid text-ink border-r-2 border-white hover:bg-white hover:text-ink transition-colors shrink-0 font-mono font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
        title="TOGGLE VIEW MODE"
      >
        {viewMode === 'bento' ? <BookOpen size={12} strokeWidth={3} /> : <LayoutTemplate size={12} strokeWidth={3} />}
        <span>{viewMode === 'bento' ? 'MANGA' : 'BENTO'}</span>
      </button>
      
      <div className="relative flex-1 flex items-center bg-transparent">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH DATABASE..."
          className="bg-transparent font-mono text-xs px-5 py-4 outline-none uppercase flex-1 placeholder-white/40 text-white min-w-0 tracking-[0.15em] focus:bg-white/5 transition-colors duration-300 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 p-1.5 text-white/50 hover:text-acid hover:scale-110 transition-all cursor-pointer z-10"
            title="CLEAR SEARCH"
          >
            <X size={14} strokeWidth={3} />
          </button>
        )}
      </div>
      <motion.button 
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        type="submit" 
        className="px-5 bg-white text-ink border-l-2 border-white hover:bg-acid transition-colors shrink-0"
      >
        <Search size={18} strokeWidth={3} />
      </motion.button>
    </form>
  );

  const renderMobileHeader = () => {
    if (showMobileSearch) {
      return (
        <div className="h-[10vh] border-b-[4px] border-white flex items-center px-4 bg-void gap-3 z-30 shrink-0 w-full">
          <button 
            type="button" 
            onClick={() => setShowMobileSearch(false)}
            className="p-2 text-white hover:text-acid"
          >
            <X size={20} strokeWidth={3} />
          </button>
          <form onSubmit={handleSearch} className="flex-1 flex border-2 border-white bg-ink items-stretch h-10">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH DATABASE..."
              className="bg-transparent font-mono text-[10px] px-3 outline-none uppercase flex-1 placeholder-white/40 text-white min-w-0 tracking-wider"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="px-2 text-white/50 hover:text-acid"
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
            <button type="submit" className="px-3 bg-white text-ink border-l border-white">
              <Search size={14} strokeWidth={3} />
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="h-[10vh] border-b-[4px] border-white flex items-center justify-between px-4 bg-void z-30 shrink-0 w-full">
        <div className="flex items-center gap-2">
          <GalleryShaderText text="GALLERY" className="text-2xl font-display uppercase m-0 leading-none mix-blend-difference" />
          <span className="font-mono text-[8px] font-bold bg-white text-ink px-1.5 py-0.5 border border-ink uppercase tracking-widest animate-pulse">
            {viewMode === 'bento' ? 'BENTO' : 'MANGA'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMobileSearch(true)}
            className="p-2 border-2 border-white bg-ink text-white hover:bg-acid hover:text-ink active:scale-95 transition-all"
          >
            <Search size={16} strokeWidth={3} />
          </button>
          <button 
            type="button"
            onClick={() => setViewMode(prev => prev === 'bento' ? 'manga' : 'bento')}
            className="px-2.5 py-2 border-2 border-white bg-acid text-ink font-mono font-black text-[9px] uppercase tracking-wider flex items-center gap-1 hover:bg-white hover:text-ink active:scale-95 transition-all"
          >
            {viewMode === 'bento' ? <BookOpen size={10} strokeWidth={3} /> : <LayoutTemplate size={10} strokeWidth={3} />}
            <span>{viewMode === 'bento' ? 'MANGA' : 'BENTO'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={galleryRef}
      className="w-full h-full relative bg-ink overflow-hidden"
      onWheel={handleWheel}
      onMouseMove={handleGalleryMouseMove}
      onMouseLeave={handleGalleryMouseLeave}
      style={{
        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
        backgroundSize: '24px 24px'
      }}
    >
      {catalog.length === 0 ? (
        <div className="flex-1 flex items-center justify-center w-full h-full font-display text-4xl uppercase text-white animate-pulse">
          {isSearching ? 'Querying Database...' : 'Loading Gallery...'}
        </div>
      ) : isMobile ? (
        viewMode === 'manga' ? (
          /* MOBILE MANGA VIEW */
          <div className="w-full h-full flex flex-col justify-between bg-ink text-white relative z-20">
            {/* Header */}
            {renderMobileHeader()}

            {/* Panels Slider (90vh) */}
            <div 
              ref={mobileMangaRef}
              className="w-full h-[90vh] flex flex-row items-center overflow-x-auto snap-x snap-mandatory px-6 gap-4 bg-ink py-4 scrollbar-none"
              style={{ scrollbarWidth: 'none' }}
            >
              {catalog.map((item, idx) => {
                const isActive = idx === currentIndex;
                const defaultPolygon = MANGA_POLYGONS[idx % MANGA_POLYGONS.length];
                const currentPolygon = isActive ? HOVERED_POLYGON : defaultPolygon;
                
                return (
                  <motion.div
                    key={item.id}
                    onClick={() => {
                      if (idx !== currentIndex) {
                        triggerImpact();
                        setCurrentIndex(idx);
                      }
                    }}
                    animate={{
                      width: isActive ? '75vw' : '45vw',
                      clipPath: currentPolygon,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 22,
                    }}
                    className={`h-[68vh] relative overflow-hidden group/manga border-[3px] border-white cursor-pointer shrink-0 snap-center ${
                      isActive ? 'z-10 shadow-[6px_6px_0px_var(--color-acid)]' : 'z-0 opacity-60'
                    }`}
                  >
                    {/* Background Image */}
                    <div className="absolute inset-0 w-full h-full bg-void">
                      <img 
                        src={item.posterImage} 
                        alt={item.title} 
                        className={`w-full h-full object-cover transition-all duration-700 ${
                          isActive 
                            ? 'scale-105 filter-none brightness-[0.75]' 
                            : 'scale-100 grayscale opacity-65'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none z-10" />
                      
                      {/* Half-tone overlay */}
                      <div 
                        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay z-10"
                        style={{
                          backgroundImage: `radial-gradient(circle, #fff 15%, transparent 16%)`,
                          backgroundSize: '6px 6px'
                        }}
                      />
                    </div>

                    {/* Vertical Title (when inactive) */}
                    <motion.div
                      animate={{
                        opacity: isActive ? 0 : 1,
                        y: isActive ? -20 : 0
                      }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex flex-col justify-end items-center pb-8 z-20 pointer-events-none"
                    >
                      <div className="bg-ink border-2 border-white p-2.5 shadow-[3px_3px_0px_var(--color-acid)] max-w-[85%]">
                        <h3 
                          className="font-display text-xs uppercase tracking-tighter whitespace-nowrap text-white text-center"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                          {item.title}
                        </h3>
                      </div>
                    </motion.div>

                    {/* Details Overlay (when active) */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 15 }}
                          transition={{ delay: 0.1, duration: 0.25 }}
                          className="absolute inset-0 z-20 p-4 flex flex-col justify-end text-white select-none pointer-events-none"
                        >
                          <div className="flex gap-2 mb-1.5">
                            {item.score && (
                              <span className="bg-acid text-ink font-mono font-black text-[9px] px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_white]">
                                ★ {item.score}%
                              </span>
                            )}
                            {item.year && (
                              <span className="bg-white text-ink font-mono font-black text-[9px] px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_var(--color-cyber)]">
                                {item.year}
                              </span>
                            )}
                          </div>

                          <h2 className="font-display text-lg uppercase leading-none tracking-tighter mb-1 text-white">
                            {item.title}
                          </h2>

                          {item.jpTitle && (
                            <div className="font-jp font-black text-xs text-acid tracking-wide mb-2">
                              {item.jpTitle}
                            </div>
                          )}

                          <p className="font-mono text-[8px] leading-relaxed text-white/95 line-clamp-3 bg-black/70 p-2 border-l-2 border-acid backdrop-blur-sm">
                            {item.synopsis}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Outline border to mimic a comic-book frame */}
                    <div className="absolute inset-0 border-[3px] border-white pointer-events-none z-20" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* MOBILE BENTO VIEW */
          <div className="w-full h-full flex flex-col justify-between bg-ink text-white relative z-20">
            {/* Header */}
            {renderMobileHeader()}

            {/* Image Panel (35vh) */}
            <div className="w-full h-[35vh] relative overflow-hidden border-b-[4px] border-white bg-void flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentSrc}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  src={currentSrc ? `https://wsrv.nl/?url=${encodeURIComponent(currentSrc)}` : ''}
                  alt={featured.title}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Pinned controls inside image top-right */}
              <div className="absolute top-3 right-3 z-30 flex gap-1.5">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setImageType(prev => prev === 'poster' ? 'cover' : 'poster');
                  }}
                  className="bg-acid text-ink border-[2px] border-ink px-2.5 py-1.5 font-mono font-black text-[8px] uppercase flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                >
                  {imageType === 'poster' ? <ImageIcon size={10} /> : <LayoutTemplate size={10} />}
                  <span>{imageType === 'poster' ? 'BANNER' : 'POSTER'}</span>
                </motion.button>

                <div className="relative">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                    className="bg-white text-ink border-[2px] border-ink px-2.5 py-1.5 font-mono font-black text-[8px] uppercase flex items-center gap-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  >
                    <Download size={10} />
                    <span>DL</span>
                  </motion.button>

                  <AnimatePresence>
                    {isDownloadOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsDownloadOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.95 }}
                          className="absolute right-0 mt-1 w-32 bg-ink border-[2px] border-white text-white font-mono text-[8px] font-bold uppercase z-50 shadow-[4px_4px_0px_rgba(255,255,255,1)]"
                        >
                          <button 
                            onClick={() => { setIsDownloadOpen(false); handleDownload('raw'); }}
                            className="w-full text-left px-2.5 py-2 hover:bg-acid hover:text-ink border-b border-white/20"
                          >
                            Raw JPG
                          </button>
                          <button 
                            onClick={() => { setIsDownloadOpen(false); handleDownload('png'); }}
                            className="w-full text-left px-2.5 py-2 hover:bg-acid hover:text-ink border-b border-white/20"
                          >
                            PNG
                          </button>
                          <button 
                            onClick={() => { 
                              setIsDownloadOpen(false); 
                              setSelectedHighlightColor(accentColor);
                              setSelectedShadowColor('#000000');
                              setIsDuotonePopupOpen(true); 
                            }}
                            className="w-full text-left px-2.5 py-2 hover:bg-acid hover:text-ink border-b border-white/20"
                          >
                            Duo-Tone
                          </button>
                          <button 
                            onClick={() => { setIsDownloadOpen(false); handleDownload('svg'); }}
                            className="w-full text-left px-2.5 py-2 hover:bg-acid hover:text-ink"
                          >
                            SVG
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Details Panel (35vh) */}
            <div 
              className="w-full h-[35vh] overflow-hidden flex flex-col justify-between p-4 relative border-b-[4px] border-white"
              style={{ 
                background: `linear-gradient(135deg, ${accentColor}80 0%, #000000 100%), ${accentColor}`,
                backgroundBlendMode: 'multiply'
              }}
            >
              <div className="flex flex-col min-h-0">
                <div className="flex gap-2 items-center mb-1">
                  {featured.score && (
                    <span className="bg-acid text-ink font-mono font-black text-[9px] px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_white]">
                      ★ {featured.score}%
                    </span>
                  )}
                  {featured.year && (
                    <span className="bg-white text-ink font-mono font-black text-[9px] px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_var(--color-cyber)]">
                      {featured.year}
                    </span>
                  )}
                  <span className="font-mono text-[8px] font-bold text-white/60 ml-auto uppercase">// {featured.subtype}</span>
                </div>

                <h1 className="font-display uppercase leading-tight text-xl tracking-tighter line-clamp-1 text-white" style={{ WebkitTextStroke: '1px black' }}>
                  {featured.title}
                </h1>

                {featured.jpTitle && (
                  <div className="font-jp font-black text-sm text-acid tracking-wide leading-none mt-0.5" style={{ WebkitTextStroke: '1px black', paintOrder: 'stroke fill' }}>
                    {featured.jpTitle}
                  </div>
                )}
                
                <div className="flex-1 overflow-y-auto mt-2 pr-1 font-mono text-[9px] leading-relaxed text-white/90 bg-black/40 p-2 border-l-2 border-acid backdrop-blur-sm scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                  {featured.synopsis || 'NO DESCRIPTION AVAILABLE.'}
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto py-1 mt-1.5 scrollbar-none shrink-0" style={{ scrollbarWidth: 'none' }}>
                {featured.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="font-mono font-bold text-[8px] px-1.5 py-0.5 bg-white text-ink uppercase shrink-0 border border-ink shadow-[1px_1px_0px_rgba(255,255,255,0.3)]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Thumbnails Slider (20vh) */}
            <div 
              ref={mobileThumbRef}
              className="w-full h-[20vh] flex flex-row overflow-x-auto overflow-y-hidden bg-ink py-2 px-3 gap-3 scrollbar-none snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              {catalog.map((item, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <motion.div
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (idx !== currentIndex) {
                        triggerImpact();
                      }
                      setCurrentIndex(idx);
                    }}
                    className={`flex flex-row items-center w-[150px] shrink-0 border-2 p-2 snap-center rounded-sm cursor-pointer ${
                      isActive ? 'text-ink border-white' : 'text-white border-white/20'
                    }`}
                    style={isActive ? { backgroundColor: accentColor } : undefined}
                  >
                    <div className="w-10 h-12 shrink-0 border border-current overflow-hidden bg-void mr-2">
                      <img 
                        src={imageType === 'cover' ? (item.coverImage || item.posterImage) : item.posterImage} 
                        alt="" 
                        className={`w-full h-full object-cover ${isActive ? 'grayscale-0' : 'grayscale'}`} 
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="font-display uppercase text-[9px] truncate leading-tight">
                        {item.title}
                      </div>
                      <div className="font-mono text-[7px] font-bold uppercase tracking-widest mt-0.5 opacity-70">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )
      ) : viewMode === 'manga' ? (
        /* MANGA PANELS VIEWPORT */
        <div className="w-full h-full flex flex-col bg-ink text-white relative z-20">
          {/* Header */}
          <div className="h-[12vh] border-b-[4px] border-white flex items-center justify-between px-6 bg-void z-30 shrink-0">
            <div className="flex items-center gap-4">
              <GalleryShaderText text="MANGA" className="text-4xl md:text-5xl font-display uppercase m-0 leading-none mix-blend-difference" />
              <span className="font-mono text-[9px] font-bold bg-white text-ink px-2 py-0.5 border-2 border-ink uppercase tracking-widest hidden md:inline-block animate-pulse shadow-[2px_2px_0px_var(--color-acid)]">
                PANEL VIEW
              </span>
            </div>
            {renderSearchBar("border-2 border-white max-w-md w-full")}
          </div>

          {/* Panels Grid */}
          <div className="flex-1 flex w-full h-[88vh] overflow-hidden">
            {catalog.map((item, idx) => {
              const isHovered = hoveredMangaIndex === idx;
              const isAnyHovered = hoveredMangaIndex !== null;
              const isActive = idx === currentIndex;
              
              const defaultPolygon = MANGA_POLYGONS[idx % MANGA_POLYGONS.length];
              const currentPolygon = isHovered ? HOVERED_POLYGON : defaultPolygon;
              
              return (
                <motion.div
                  key={item.id}
                  onMouseEnter={() => setHoveredMangaIndex(idx)}
                  onMouseLeave={() => setHoveredMangaIndex(null)}
                  onClick={() => {
                    setCurrentIndex(idx);
                  }}
                  animate={{
                    flex: isHovered ? 4.5 : (isAnyHovered ? 0.6 : 1),
                    clipPath: currentPolygon,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 220,
                    damping: 24,
                  }}
                  className={`h-full relative overflow-hidden group/manga border-r-[3px] border-white cursor-pointer ${
                    isActive ? 'z-10' : 'z-0'
                  }`}
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 w-full h-full bg-void">
                    <img 
                      src={item.posterImage} 
                      alt={item.title} 
                      className={`w-full h-full object-cover transition-all duration-700 ${
                        isHovered 
                          ? 'scale-105 filter-none brightness-[0.7]' 
                          : 'scale-100 grayscale opacity-60 group-hover/manga:grayscale-0 group-hover/manga:opacity-85'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none z-10" />
                    
                    {/* Half-tone overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay z-10"
                      style={{
                        backgroundImage: `radial-gradient(circle, #fff 15%, transparent 16%)`,
                        backgroundSize: '6px 6px'
                      }}
                    />
                  </div>

                  {/* Vertical Title (when collapsed) */}
                  <motion.div
                    animate={{
                      opacity: isHovered ? 0 : 1,
                      y: isHovered ? -20 : 0
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col justify-end items-center pb-8 z-20 pointer-events-none"
                  >
                    <div className="bg-ink border-2 border-white p-3 shadow-[4px_4px_0px_var(--color-acid)] max-w-[80%]">
                      <h3 
                        className="font-display text-sm md:text-base uppercase tracking-tighter whitespace-nowrap text-white text-center"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      >
                        {item.title}
                      </h3>
                    </div>
                  </motion.div>

                  {/* Details Overlay (when expanded) */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.15, duration: 0.3 }}
                        className="absolute inset-0 z-20 p-8 flex flex-col justify-end text-white select-none pointer-events-none"
                      >
                        <div className="flex gap-3 mb-2">
                          {item.score && (
                            <span className="bg-acid text-ink font-mono font-black text-xs px-2 py-1 border-2 border-ink shadow-[2px_2px_0px_white]">
                              ★ {item.score}%
                            </span>
                          )}
                          {item.year && (
                            <span className="bg-white text-ink font-mono font-black text-xs px-2 py-1 border-2 border-ink shadow-[2px_2px_0px_var(--color-cyber)]">
                              {item.year}
                            </span>
                          )}
                        </div>

                        <h2 className="font-display text-2xl md:text-4xl lg:text-5xl uppercase leading-none tracking-tighter mb-2 text-white">
                          {item.title}
                        </h2>

                        {item.jpTitle && (
                          <div className="font-jp font-black text-base md:text-xl text-acid tracking-wide mb-4">
                            {item.jpTitle}
                          </div>
                        )}

                        <p className="font-mono text-xs md:text-sm text-white/80 line-clamp-3 md:line-clamp-4 max-w-xl leading-relaxed bg-black/60 p-4 border-l-4 border-acid backdrop-blur-sm">
                          {item.synopsis}
                        </p>

                        <div className="mt-6 flex items-center gap-4">
                          <span className="font-mono text-[9px] font-black tracking-widest text-acid animate-pulse">
                            {isActive ? '[ IN FOCUS ]' : '[ CLICK TO FOCUS ]'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Outline border to mimic a comic-book frame */}
                  <div className="absolute inset-0 border-[3px] border-white pointer-events-none z-20" />
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        /* BENTO GRID VIEWPORT */
        <>
          {/* GALLERY HEADING — fixed top-left, always visible */}
          <div className="absolute top-6 left-6 z-30 pointer-events-none">
            <GalleryShaderText text="GALLERY" className="text-4xl md:text-6xl font-display uppercase m-0 leading-none mix-blend-difference" />
          </div>

          {/* IMAGE — pinned to top-left, sized to its real dimensions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSrc}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 0.97 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
              className="absolute top-0 left-0 z-10 group/img"
              style={{ width: dynamicBorderX, height: dynamicBorderY }}
            >
              <img
                ref={imgRef}
                src={currentSrc ? `https://wsrv.nl/?url=${encodeURIComponent(currentSrc)}` : ''}
                alt={featured.title}
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                className="w-full h-full object-cover bg-ink transition-all duration-500 group-hover/img:brightness-110 group-hover/img:contrast-110"
              />

              {/* Subtle vignette overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Controls pinned inside image top-right */}
              <div className="absolute top-4 right-4 z-30 flex gap-2">
                {/* View Format Toggle */}
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setImageType(prev => prev === 'poster' ? 'cover' : 'poster');
                  }}
                  className="bg-acid text-ink border-[4px] border-ink px-3 py-2 font-mono font-black text-[10px] uppercase flex items-center gap-2 hover:bg-white hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-200"
                >
                  {imageType === 'poster' ? <ImageIcon size={14} /> : <LayoutTemplate size={14} />}
                  {imageType === 'poster' ? 'BANNER' : 'POSTER'}
                </motion.button>

                {/* Download Dropdown */}
                <div className="relative">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isDownloading}
                    onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                    className="bg-white text-ink border-[4px] border-ink px-3 py-2 font-mono font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-acid hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-200 disabled:opacity-80 disabled:pointer-events-none min-w-[120px] h-[36px] overflow-hidden relative"
                  >
                    <AnimatePresence mode="popLayout">
                      {isDownloading ? (
                        downloadStatus === 'TRACING...' ? (
                          <motion.div
                            key="tracing-status"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-start absolute inset-0"
                          >
                            <motion.div
                              animate={{
                                y: [0, -36, -36, 0, 0], 
                                rotate: [0, -4, 4, -4, 4, 0, 0, 0, 0, 0]
                              }}
                              transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                times: [0, 0.2, 0.5, 0.7, 1]
                              }}
                              className="flex flex-col items-center w-full"
                            >
                              <div className="h-[36px] w-full flex items-center justify-center text-acid drop-shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] text-[11px] tracking-widest font-black">
                                TRACING...
                              </div>
                              <div className="h-[36px] w-full flex items-center justify-center text-ink text-[11px] tracking-widest font-black">
                                WAIT: {(svgTimer / 10).toFixed(1)}S
                              </div>
                            </motion.div>
                          </motion.div>
                        ) : (
                          <motion.span 
                            key="downloading-status"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2"
                          >
                            <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full" />
                            {downloadStatus || 'SAVING...'}
                          </motion.span>
                        )
                      ) : (
                        <motion.span 
                          key="idle-status"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Download size={14} />
                          DOWNLOAD
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <AnimatePresence>
                    {isDownloadOpen && (
                      <>
                        {/* Transparent backdrop to close dropdown */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsDownloadOpen(false)}
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-48 bg-ink border-[4px] border-white text-white font-mono text-[10px] font-bold uppercase z-50 shadow-[6px_6px_0px_rgba(255,255,255,1)]"
                        >
                          <button 
                            onClick={() => { setIsDownloadOpen(false); handleDownload('raw'); }}
                            className="w-full text-left px-4 py-3 hover:bg-acid hover:text-ink border-b-2 border-white/20 transition-colors"
                          >
                            Raw JPG
                          </button>
                          <button 
                            onClick={() => { setIsDownloadOpen(false); handleDownload('png'); }}
                            className="w-full text-left px-4 py-3 hover:bg-acid hover:text-ink border-b-2 border-white/20 transition-colors"
                          >
                            Converted PNG
                          </button>
                          <button 
                            onClick={() => { 
                              setIsDownloadOpen(false); 
                              setSelectedHighlightColor(accentColor);
                              setSelectedShadowColor('#000000');
                              setIsDuotonePopupOpen(true); 
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-acid hover:text-ink border-b-2 border-white/20 transition-colors"
                          >
                            Dual-Tone PNG
                          </button>
                          <button 
                            onClick={() => { setIsDownloadOpen(false); handleDownload('svg'); }}
                            className="w-full text-left px-4 py-3 hover:bg-acid hover:text-ink transition-colors"
                          >
                            Vector SVG (Detailed)
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 
            ADAPTIVE UI PANELS
            Logic:
            - hasRightSpace: image doesn't fill full width → show right panel
            - hasBottomSpace: image doesn't fill full height → show bottom panel
            - If ONLY right panel: meta + search + thumbnails all go in right panel
            - If ONLY bottom panel: meta + search + thumbnails all go in bottom panel  
            - If BOTH: meta in bottom, search+thumbnails in right
          */}
          
          {imageLoaded && (() => {
            const containerH = galleryRef.current?.clientHeight || 0;
            const containerW = galleryRef.current?.clientWidth || 0;
            const hasRightSpace = imgWidth < containerW - 20;
            const hasBottomSpace = imgHeight < containerH - 20;

            const metaHeight = Math.min(450, Math.max(240, Math.round(containerH * 0.4)));

            // Reusable Meta Block
            const renderMetaBlock = (height: number, className = '') => {
              // Calculate dynamic font sizes
              const titleFontSize = Math.min(84, Math.max(36, Math.round(height * 0.18)));
              const enFontSize = Math.min(28, Math.max(14, Math.round(height * 0.08)));
              const jpFontSize = Math.min(64, Math.max(26, Math.round(height * 0.14)));
              const padding = Math.min(28, Math.max(16, Math.round(height * 0.07)));

              return (
                <div 
                  className={`overflow-hidden flex flex-col justify-between h-full min-w-0 ${className}`}
                  style={{ 
                    padding: `${padding}px`, 
                    height: `${height}px`,
                    background: `linear-gradient(135deg, ${accentColor}80 0%, #000000 100%), ${accentColor}`,
                    backgroundBlendMode: 'multiply'
                  }}
                >
                  <div className="flex flex-col">
                    <motion.h1 
                      key={featured.id + '-title'}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="font-display uppercase leading-[0.95] line-clamp-2"
                      style={{ 
                        fontSize: `${titleFontSize}px`,
                        color: accentColor,
                        WebkitTextStroke: '3px black'
                      }}
                    >
                      {featured.title}
                    </motion.h1>
                    <motion.h2 
                      key={featured.id + '-en'}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="font-mono tracking-[0.25em] uppercase line-clamp-1 mt-2 font-black"
                      style={{ 
                        fontSize: `${enFontSize}px`,
                        color: accentColor,
                        WebkitTextStroke: '1px black'
                      }}
                    >
                      {featured.englishTitle || 'NO_ENGLISH_TITLE'}
                    </motion.h2>
                    <motion.div 
                      key={featured.id + '-jp'}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      className="font-jp leading-tight line-clamp-1 mt-3 font-black"
                      style={{ 
                        fontSize: `${jpFontSize}px`,
                        color: accentColor,
                        WebkitTextStroke: '2px black',
                        paintOrder: 'stroke fill'
                      }}
                    >
                      {featured.jpTitle || featured.title}
                    </motion.div>
                  </div>
                  
                  <motion.div 
                    key={featured.id + '-tags'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="flex gap-2 flex-wrap mt-4"
                  >
                    {featured.tags.slice(0, 5).map(tag => (
                      <motion.span 
                        key={tag} 
                        whileHover={{ scale: 1.15, y: -2 }}
                        className="font-mono font-bold px-2 py-1 bg-white text-ink uppercase cursor-default shadow-[2px_2px_0px_rgba(255,255,255,0.3)] hover:shadow-[4px_4px_0px_var(--color-acid)] hover:bg-acid transition-colors duration-200"
                        style={{ fontSize: `${Math.min(13, Math.max(9, Math.round(height * 0.035)))}px` }}
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </motion.div>
                </div>
              );
            };

            // Reusable Thumbnail List
            const renderThumbnailList = (direction: 'vertical' | 'horizontal' = 'vertical') => (
              <div 
                className={`flex-1 flex thumbnail-list bg-ink ${direction === 'horizontal' ? 'flex-row overflow-x-auto overflow-y-hidden' : 'flex-col overflow-y-auto overflow-x-hidden'}`} 
                style={{ scrollbarWidth: 'none' }}
              >
                {catalog.map((item, idx) => {
                  const isActive = idx === currentIndex;
                  const isThumbHovered = hoveredThumbIndex === idx;
                  return (
                    <motion.div 
                      key={item.id}
                      onMouseEnter={() => setHoveredThumbIndex(idx)}
                      onMouseLeave={() => setHoveredThumbIndex(null)}
                      whileHover={{ x: isActive ? 0 : (direction === 'vertical' ? 8 : 0), y: isActive ? 0 : (direction === 'horizontal' ? -4 : 0), backgroundColor: isActive ? undefined : 'rgba(255,255,255,0.08)' }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      onClick={() => {
                        if (idx !== currentIndex) {
                          triggerImpact();
                        }
                        setCurrentIndex(idx);
                      }}
                      className={`flex cursor-pointer shrink-0 ${
                        direction === 'horizontal' 
                          ? `flex-col w-40 md:w-48 border-r-2 border-white/20 p-4 h-full` 
                          : `flex-row items-center h-24 border-b-2 border-white/20 p-4 w-full`
                      } ${isActive ? 'text-ink border-white' : 'text-white'}`}
                      style={isActive ? { backgroundColor: accentColor } : undefined}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.08 }}
                        className={`shrink-0 border-2 border-current overflow-hidden relative bg-void ${direction === 'horizontal' ? 'w-full h-24 mb-3' : 'w-14 h-16 mr-3'}`}
                      >
                        <img src={imageType === 'cover' ? (item.coverImage || item.posterImage) : item.posterImage} alt="" className={`w-full h-full object-cover transition-all duration-300 ${isActive ? 'grayscale-0' : 'grayscale hover:grayscale-0'}`} />
                      </motion.div>
                      <div className="flex-1 overflow-hidden flex flex-col justify-center">
                        <motion.div 
                          animate={{ 
                            fontSize: isThumbHovered ? (direction === 'vertical' ? '1.25rem' : '1.1rem') : '0.875rem',
                          }}
                          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                          className="font-display uppercase truncate leading-tight"
                        >
                          {item.title}
                        </motion.div>
                        <div className="font-mono text-[9px] font-bold uppercase tracking-widest mt-1 opacity-70 truncate">
                          {String(idx + 1).padStart(2, '0')} // INDEX
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            );

            return (
              <>
                {/* === SCENARIO 1: Both right + bottom space (L-shape) === */}
                {hasRightSpace && hasBottomSpace && (
                  <>
                    {/* Right: search + thumbnails */}
                    <motion.div 
                      className="absolute top-0 right-0 bottom-0 z-20 flex flex-col bg-void text-white border-l-2 border-t-2 border-white overflow-hidden"
                      style={{ left: dynamicBorderX }}
                    >
                      {renderSearchBar("border-b-2 border-white")}
                      {renderThumbnailList("vertical")}
                    </motion.div>
                    {/* Bottom: meta info */}
                    <motion.div 
                      className="absolute left-0 bottom-0 z-20 bg-void text-white border-t-2 border-white overflow-hidden flex flex-col"
                      style={{ width: dynamicBorderX, top: dynamicBorderY, height: dynamicBottomHeight }}
                    >
                      {renderMetaBlock(containerH - imgHeight)}
                    </motion.div>
                  </>
                )}

                {/* === SCENARIO 2: Only right space (poster fills full height) === */}
                {hasRightSpace && !hasBottomSpace && (
                  <motion.div 
                    className="absolute top-0 right-0 bottom-0 z-20 flex flex-col bg-void text-white border-l-2 border-t-2 border-white overflow-hidden"
                    style={{ left: dynamicBorderX }}
                  >
                    {renderMetaBlock(metaHeight, "border-b-2 border-white shrink-0")}
                    {renderSearchBar("border-b-2 border-white")}
                    {renderThumbnailList("vertical")}
                  </motion.div>
                )}

                {/* === SCENARIO 3: Only bottom space (banner fills full width) === */}
                {!hasRightSpace && hasBottomSpace && (
                  <motion.div 
                    className="absolute left-0 right-0 bottom-0 z-20 bg-void text-white border-t-2 border-white overflow-hidden flex flex-row"
                    style={{ top: dynamicBorderY, height: dynamicBottomHeight }}
                  >
                    {renderMetaBlock(containerH - imgHeight, "shrink-0 w-[40%] border-r-2 border-white")}
                    <div className="flex-1 flex flex-col h-full min-w-0">
                      {renderSearchBar("border-b-2 border-white")}
                      {renderThumbnailList("horizontal")}
                    </div>
                  </motion.div>
                )}

                {/* === SCENARIO 4: No space at all (image fills everything) === */}
                {!hasRightSpace && !hasBottomSpace && (
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white p-6 pointer-events-none">
                    <h1 className="font-display text-3xl uppercase leading-tight line-clamp-1">
                      {featured.title}
                    </h1>
                    <div className="font-mono text-[10px] text-white/60 tracking-[0.2em] uppercase mt-1">
                      {featured.englishTitle || ''}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {isDuotonePopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div 
            className="bg-ink border-[6px] border-white max-w-sm w-full p-6 text-white font-mono uppercase text-[11px] shadow-[10px_10px_0px_rgba(255,255,255,1)] relative flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-white/20 pb-2">
              <span className="font-display text-base text-acid">CUSTOM DUAL-TONE</span>
              <button 
                onClick={() => setIsDuotonePopupOpen(false)}
                className="text-white hover:text-acid transition-colors p-1"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Preview Block */}
            <div 
              className="w-full h-16 border-[4px] border-white flex items-center justify-center font-black text-xs tracking-wider transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${selectedShadowColor} 0%, ${selectedHighlightColor} 100%)`,
                color: selectedHighlightColor,
                textShadow: '2px 2px 0px black'
              }}
            >
              DUAL-TONE PREVIEW
            </div>

            {/* HIGHLIGHT COLOR (NEON / FUNKY) */}
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-white/60 font-bold">HIGHLIGHT COLOR (NEO/FUNKY):</div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {/* Dynamically append the current accentColor as the first option if it's not already in the list */}
                {[{ name: 'CURRENT ACCENT', hex: accentColor }, ...FUNKY_HIGHLIGHT_COLORS].map((c, i) => (
                  <button
                    key={c.hex + '-' + i}
                    type="button"
                    onClick={() => setSelectedHighlightColor(c.hex)}
                    className={`w-7 h-7 rounded-full shrink-0 border-2 transition-all ${
                      selectedHighlightColor.toLowerCase() === c.hex.toLowerCase() 
                        ? 'border-white scale-110 shadow-[0_0_8px_white]' 
                        : 'border-ink hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/60">SPECTRUM:</span>
                <input
                  type="color"
                  value={selectedHighlightColor}
                  onChange={(e) => setSelectedHighlightColor(e.target.value)}
                  className="w-8 h-6 bg-transparent border-2 border-white cursor-pointer p-0 outline-none"
                />
                <span className="text-[9px] font-bold text-acid">{selectedHighlightColor}</span>
              </div>
            </div>

            {/* SHADOW COLOR (DARK MATCHES) */}
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-white/60 font-bold">SHADOW COLOR (DARK MATCHES):</div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {MATCHING_DARK_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedShadowColor(c.hex)}
                    className={`w-7 h-7 rounded-full shrink-0 border-2 transition-all ${
                      selectedShadowColor.toLowerCase() === c.hex.toLowerCase() 
                        ? 'border-white scale-110 shadow-[0_0_8px_white]' 
                        : 'border-ink hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/60">SPECTRUM:</span>
                <input
                  type="color"
                  value={selectedShadowColor}
                  onChange={(e) => setSelectedShadowColor(e.target.value)}
                  className="w-8 h-6 bg-transparent border-2 border-white cursor-pointer p-0 outline-none"
                />
                <span className="text-[9px] font-bold text-acid">{selectedShadowColor}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-2 pt-2 border-t-2 border-white/20">
              <button
                onClick={() => {
                  setIsDuotonePopupOpen(false);
                  handleDownload('duotone');
                }}
                className="flex-1 bg-acid text-ink border-[4px] border-ink py-2 font-mono font-black text-[10px] uppercase text-center hover:bg-white hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-200"
              >
                DOWNLOAD
              </button>
              <button
                onClick={() => setIsDuotonePopupOpen(false)}
                className="flex-1 bg-white text-ink border-[4px] border-ink py-2 font-mono font-black text-[10px] uppercase text-center hover:bg-red-500 hover:text-white hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-200"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
