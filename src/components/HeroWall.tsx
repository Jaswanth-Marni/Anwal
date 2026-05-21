import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fetchTopAnime, type NormalizedAnime } from '../api/kitsu';

const WALL_SLOTS = [
  { x: '5%', y: '10%', rotate: -8, peelX: 15, peelY: -10 },
  { x: '55%', y: '5%', rotate: 12, peelX: -10, peelY: 20 },
  { x: '25%', y: '40%', rotate: -4, peelX: 25, peelY: 5 },
  { x: '65%', y: '50%', rotate: -15, peelX: 0, peelY: -25 },
  { x: '10%', y: '65%', rotate: 6, peelX: -15, peelY: -5 },
];

interface WallpaperData {
  id: number;
  title: string;
  src: string;
  x: string;
  y: string;
  rotate: number;
  peelX: number;
  peelY: number;
}

function buildWallpapers(list: NormalizedAnime[]): WallpaperData[] {
  return WALL_SLOTS.map((slot, index) => {
    const item = list[index];
    if (!item) return null;

    const src = item.coverImage || item.posterImage;
    if (!src) return null;

    return {
      id: index + 1,
      title: item.title.toUpperCase(),
      src,
      x: slot.x,
      y: slot.y,
      rotate: slot.rotate,
      peelX: slot.peelX,
      peelY: slot.peelY,
    };
  }).filter((item): item is WallpaperData => Boolean(item));
}

export default function HeroWall() {
  const [wallpapers, setWallpapers] = useState<WallpaperData[]>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const list = await fetchTopAnime();
      if (!isMounted) return;
      setWallpapers(buildWallpapers(list));
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const rollerTitles = wallpapers.length > 0
    ? wallpapers
    : WALL_SLOTS.map((slot, index) => ({
        id: index + 1,
        title: 'LOADING KITSU',
        src: '',
        x: slot.x,
        y: slot.y,
        rotate: slot.rotate,
        peelX: slot.peelX,
        peelY: slot.peelY,
      }));

  return (
    <div 
      className="absolute inset-0 top-[20vh] overflow-hidden z-10"
      style={{ perspective: '2000px' }}
    >
      
      {/* 
        1. THE PAINT ROLLER REVEAL 
        Massive typography that rolls in horizontally
      */}
      <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none opacity-20 mix-blend-multiply">
        {rollerTitles.map((anime, i) => (
          <div key={anime.id} className="relative overflow-visible w-full flex items-center">
            {/* The Text - changed leading-none and added py-2 to prevent clipping */}
            <h1 className="font-display text-[9vw] leading-none tracking-tighter text-ink uppercase whitespace-nowrap py-2">
              {anime.title} // {anime.title} // {anime.title}
            </h1>
            
            {/* The Paint Roller Mask (Starts white, rolls to the right to reveal the text) */}
            <motion.div 
              className="absolute inset-0 bg-paper"
              initial={{ x: '0%' }}
              animate={{ x: '100%' }}
              transition={{ 
                duration: 1.2, 
                ease: [0.76, 0, 0.24, 1],
                delay: i * 0.15 
              }}
            />
          </div>
        ))}
      </div>

      {/* 
        2. THE SLIME WALL THROW
        Images fly in from behind the camera and smash into the wall
      */}
      <div className="absolute inset-0 pointer-events-none">
        {wallpapers.map((wp, i) => (
          <motion.div
            key={wp.id}
            className="absolute w-[35vw] aspect-video bg-ink p-2 shadow-2xl border-4 border-ink group pointer-events-auto cursor-pointer flex flex-col justify-end"
            style={{
              left: wp.x,
              top: wp.y,
              transformStyle: 'preserve-3d'
            }}
            initial={{ 
              scale: 5,
              opacity: 0, 
              z: 1000, 
              rotate: wp.rotate + 60,
              rotateX: 0,
              rotateY: 0
            }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              z: 0,
              rotate: wp.rotate,
              rotateX: wp.peelX,
              rotateY: wp.peelY
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 15,
              mass: 1.5,
              delay: 1.5 + (i * 0.2)
            }}
            whileHover={{
              scale: 1.05,
              rotateX: 0,
              rotateY: 0,
              z: 50,
              boxShadow: '15px 15px 0px var(--color-acid)',
              transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
          >
            {/* The Image */}
            <div className="absolute inset-0 p-2 pointer-events-none z-0">
              <img 
                src={wp.src} 
                className="w-full h-full object-cover filter grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500" 
                alt={wp.title} 
              />
            </div>
            
            {/* Brutalist Tape/Sticker to make it look manually stuck on */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-6 bg-paper opacity-80 rotate-[-3deg] border-2 border-ink z-10 pointer-events-none"></div>
            
            {/* Overlay Metadata synced to the Anime Title */}
            <div className="relative z-10 self-start ml-2 mb-2 bg-ink text-paper font-mono text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ASSET // {wp.title}
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
