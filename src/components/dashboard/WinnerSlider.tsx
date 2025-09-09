import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';

interface Winner {
  username: string;
  prize: string;
}

export default function WinnerSlider() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [emblaRef] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    const fetchWinners = async () => {
      const { data, error } = await supabase.rpc('get_past_contest_winners');
      if (error) {
        console.error('Error fetching past contest winners:', error);
        return;
      }
      setWinners(data);
    };

    fetchWinners();
  }, []);

  if (winners.length === 0) {
    return null; // Don't render anything if there are no winners
  }

  return (
    <div className="absolute bottom-0 left-0 w-full bg-black/50 p-4 overflow-hidden">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex">
          {winners.map((winner, index) => (
            <div className="embla__slide flex-shrink-0 w-full md:w-1/2 lg:w-1/3 text-center" key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-white"
              >
                <p className="font-bold text-lg">{winner.username}</p>
                <p className="text-sm text-yellow-400">Prize: {winner.prize}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
