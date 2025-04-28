
import { ReactNode } from "react";

interface RequestStatusBadgeProps {
  status: string;
}

export function getStatusLabel(status: string): ReactNode {
  switch (status) {
    case "pending":
      return <span className="text-yellow-500">Pending</span>;
    case "in_progress":
      return <span className="text-blue-500">In Progress</span>;
    case "lyrics_review":
      return <span className="text-purple-500">Lyrics Review</span>;
    case "completed":
      return <span className="text-green-500">Completed</span>;
    case "rejected":
      return <span className="text-red-500">Rejected</span>;
    default:
      return <span className="text-gray-500">Unknown</span>;
  }
}

export const RequestStatusBadge = ({ status }: RequestStatusBadgeProps) => {
  return (
    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-background border">
      {getStatusLabel(status)}
    </div>
  );
};
