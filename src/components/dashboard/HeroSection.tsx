import { useEffect, useState } from "react";
import { getSetting } from "@/utils/settingsOperations";

export default function HeroSection() {
  const [heroVideoUrl, setHeroVideoUrl] = useState('/hero-video.mp4');

  useEffect(() => {
    const fetchHeroVideo = async () => {
      const url = await getSetting('heroVideoUrl');
      if (url) {
        setHeroVideoUrl(url);
      }
    };
    fetchHeroVideo();
  }, []);

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-lg mb-6">
      {/* Background video */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        key={heroVideoUrl}
      >
        <source src={heroVideoUrl} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center text-center text-white px-6">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Make Music. Win Big.
        </h1>
        <p className="text-lg md:text-xl mb-6">
          Join the contest and showcase your talent to the world!
        </p>
        <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold shadow-lg">
          Join Contest
        </button>
      </div>
    </div>
  );
}
