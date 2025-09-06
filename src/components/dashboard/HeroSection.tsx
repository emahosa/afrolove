import { useEffect, useState } from "react";

export default function HeroSection() {
  const [status, setStatus] = useState("upcoming"); // upcoming | live | ended
  const [timeLeft, setTimeLeft] = useState(0);

  // Example contest dates
  const contestStart = new Date("2025-09-10T18:00:00").getTime();
  const contestEnd = new Date("2025-09-20T18:00:00").getTime();
  const winnerReveal = new Date("2025-09-25T18:00:00").getTime();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (now < contestStart) {
        setStatus("upcoming");
        setTimeLeft(contestStart - now);
      } else if (now >= contestStart && now < contestEnd) {
        setStatus("live");
        setTimeLeft(contestEnd - now);
      } else if (now >= contestEnd && now < winnerReveal) {
        setStatus("ended");
        setTimeLeft(winnerReveal - now);
      } else {
        setStatus("finished");
        setTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-lg mb-6">
      {/* Background video */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
      >
        <source src="/hero-video.mp4" type="video/mp4" />
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

      {/* Countdown badge on edge */}
      <div className="absolute top-6 right-6 bg-white/90 text-gray-900 px-4 py-2 rounded-xl shadow-md text-sm font-semibold">
        {status === "upcoming" && (
          <p>Contest starts in: {formatTime(timeLeft)}</p>
        )}
        {status === "live" && (
          <p>Contest ends in: {formatTime(timeLeft)}</p>
        )}
        {status === "ended" && (
          <p>Winner announced in: {formatTime(timeLeft)}</p>
        )}
        {status === "finished" && <p>Contest finished 🎉</p>}
      </div>
    </div>
  );
}
