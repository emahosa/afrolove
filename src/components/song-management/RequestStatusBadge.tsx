
import { ReactNode } from "react";

type StatusBadgeProps = {
  status: string;
};

export const getStatusBadgeClass = (status: string) => {
  switch(status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "lyrics_review":
      return "bg-purple-100 text-purple-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getStatusLabel = (status: string): ReactNode => {
  switch(status) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "lyrics_review":
      return "Lyrics Review";
    case "completed":
      return "Completed";
    default:
      return status;
  }
};

export const RequestStatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
};
