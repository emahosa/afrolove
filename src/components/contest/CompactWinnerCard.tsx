import { Trophy } from "lucide-react";
import { Contest, ContestEntry } from "@/hooks/use-contest";

interface CompactWinnerCardProps {
  winner: ContestEntry;
  contest: Contest;
}

export const CompactWinnerCard = ({ winner, contest }: CompactWinnerCardProps) => {
  if (!winner || !contest) return null;

  const cardStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '12px',
    background: 'linear-gradient(to right, rgba(255, 215, 0, 0.1), rgba(128, 0, 128, 0.1))',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    margin: '0 1rem', // Add some space between cards
    gap: '12px',
  };

  const textStyle = {
    color: '#fff',
    fontSize: '0.9rem',
  };

  const nameStyle = {
    fontWeight: 'bold',
    color: '#FFD700', // Gold color for the name
  };

  return (
    <div style={cardStyle}>
      <img
        src={`https://ui-avatars.com/api/?name=${winner.profiles?.full_name}&background=2a2a2a&color=fff&size=32`}
        alt={winner.profiles?.full_name || 'Winner'}
        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
      />
      <div style={textStyle}>
        <span style={nameStyle}>{winner.profiles?.full_name || "Unknown Artist"}</span>
        <span> won the {contest.title}!</span>
      </div>
      <Trophy className="h-5 w-5 text-yellow-400" />
    </div>
  );
};
