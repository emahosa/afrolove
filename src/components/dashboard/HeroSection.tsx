import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useContest } from "@/hooks/use-contest";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getSetting } from "@/utils/settingsOperations";

export default function HeroSection() {
  const { activeContests, upcomingContests } = useContest();
  const [contestStatus, setContestStatus] = useState<{
    status: string;
    timeLeft: number;
    title: string;
    description: string;
  } | null>(null);
  const [heroVideoUrl, setHeroVideoUrl] = useState('/hero-video.mp4');

  // Fetch the hero video URL when the component mounts
  useEffect(() => {
    const fetchHeroVideo = async () => {
      const url = await getSetting('heroVideoUrl');
      if (url) {
        setHeroVideoUrl(url);
      }
    };
    fetchHeroVideo();
  }, []);

  useEffect(() => {
    const featuredContest = activeContests[0] || upcomingContests[0];
    if (!featuredContest) {
      setContestStatus(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const contestStart = new Date(featuredContest.start_date).getTime();
      const contestEnd = new Date(featuredContest.end_date).getTime();

      let status = "";
      let timeLeft = 0;

      if (now < contestStart) {
        status = "upcoming";
        timeLeft = contestStart - now;
      } else if (now >= contestStart && now < contestEnd) {
        status = "live";
        timeLeft = contestEnd - now;
      } else {
        status = "ended";
        timeLeft = 0;
      }

      setContestStatus({
        status,
        timeLeft,
        title: featuredContest.title,
        description: featuredContest.description,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeContests, upcomingContests]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return "Ended";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="relative w-full h-[60vh]">
      {/* Background video */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        key={heroVideoUrl} // Add key to force re-render when URL changes
      >
        <source src={heroVideoUrl} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40" />

      {/* Content */}
      <motion.div
        className="relative h-full flex flex-col justify-center items-start text-left text-white p-8 md:p-16 lg:p-24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-4"
          variants={itemVariants}
        >
          {contestStatus?.title || "Make Music. Win Big."}
        </motion.h1>
        <motion.p
          className="text-lg md:text-xl mb-8 max-w-2xl"
          variants={itemVariants}
        >
          {contestStatus?.description ||
            "Join the contest and showcase your talent to the world!"}
        </motion.p>
        <motion.div variants={itemVariants}>
          <Link to="/contest">
            <Button size="lg" className="bg-dark-purple hover:bg-dark-purple/90 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg">
              {contestStatus?.status === 'live' ? 'Enter Now' : 'View Contest'}
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Countdown badge */}
      {contestStatus && contestStatus.timeLeft > 0 && (
         <motion.div
           className="absolute top-6 right-6 bg-white/90 text-gray-900 px-4 py-2 rounded-xl shadow-md text-sm font-semibold"
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 1, duration: 0.5 }}
         >
           {contestStatus.status === "upcoming" && (
             <p>Starts in: {formatTime(contestStatus.timeLeft)}</p>
           )}
           {contestStatus.status === "live" && (
             <p>Ends in: {formatTime(contestStatus.timeLeft)}</p>
           )}
         </motion.div>
      )}
    </div>
  );
}
