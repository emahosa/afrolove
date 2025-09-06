import { useEffect, useState } from "react";
import { useContest, Contest } from "@/hooks/use-contest";
import { motion } from "framer-motion";

// Helper function to format time
const formatTime = (ms: number) => {
    if (ms <= 0) return "0d 0h 0m 0s";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

export default function HeroSection() {
    const { activeContests, upcomingContests, loading } = useContest();
    const [relevantContest, setRelevantContest] = useState<Contest | null>(null);
    const [status, setStatus] = useState<"upcoming" | "live" | "finished" | "loading">("loading");
    const [timeLeft, setTimeLeft] = useState(0);

    // Determine the most relevant contest to display
    useEffect(() => {
        if (!loading) {
            // Prioritize the first active contest
            if (activeContests.length > 0) {
                setRelevantContest(activeContests[0]);
            }
            // Otherwise, show the next upcoming contest
            else if (upcomingContests.length > 0) {
                setRelevantContest(upcomingContests[0]);
            }
            // No active or upcoming contests
            else {
                setRelevantContest(null);
            }
        }
    }, [activeContests, upcomingContests, loading]);

    // Countdown logic
    useEffect(() => {
        if (!relevantContest) {
            setStatus("finished");
            setTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const contestStart = new Date(relevantContest.start_date).getTime();
            const contestEnd = new Date(relevantContest.end_date).getTime();

            if (now < contestStart) {
                setStatus("upcoming");
                setTimeLeft(contestStart - now);
            } else if (now >= contestStart && now < contestEnd) {
                setStatus("live");
                setTimeLeft(contestEnd - now);
            } else {
                setStatus("finished");
                setTimeLeft(0);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [relevantContest]);

    // Framer Motion variants for animations
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.3, delayChildren: 0.5 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100 }
        }
    };

    if (loading) {
        return (
            <div className="relative w-full h-screen flex justify-center items-center bg-black">
                 <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen overflow-hidden">
            <video
                className="absolute top-0 left-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                key={relevantContest?.id || 'no-contest-video'}
            >
                <source src="/hero-video.mp4" type="video/mp4" />
            </video>

            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>

            <div className="relative z-10 flex flex-col justify-center h-full items-start text-left text-white p-8 md:p-16 lg:p-24">

                {relevantContest && (
                    <motion.div
                        className="absolute top-8 right-8 bg-white/90 text-gray-900 px-4 py-2 rounded-xl shadow-md text-sm font-semibold"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 120, delay: 1 }}
                    >
                        {status === "upcoming" && (
                            <p>Contest starts in: {formatTime(timeLeft)}</p>
                        )}
                        {status === "live" && (
                            <p>Contest ends in: {formatTime(timeLeft)}</p>
                        )}
                        {status === "finished" && <p>Contest finished 🎉</p>}
                    </motion.div>
                )}

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-2xl"
                >
                    <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-bold mb-4">
                        {relevantContest?.title || "Make Music. Win Big."}
                    </motion.h1>
                    <motion.p variants={itemVariants} className="text-lg md:text-xl mb-6 max-w-lg">
                        {relevantContest?.description || "Join the contest and showcase your talent to the world!"}
                    </motion.p>

                    {relevantContest && (
                        <motion.div variants={itemVariants}>
                            <button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold shadow-lg transition-transform transform hover:scale-105">
                                Join Contest
                            </button>
                        </motion.div>
                    )}

                    {!relevantContest && (
                         <motion.p
                            className="text-lg md:text-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.3 }}
                         >
                            We are preparing something amazing for you. Stay tuned!
                         </motion.p>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
