
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface SafeSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  children: React.ReactNode;
  id?: string;
}

export const SafeSelect: React.FC<SafeSelectProps> = ({
  value,
  onValueChange,
  disabled,
  placeholder,
  children,
  id,
}) => {
  // Ensure value is never empty string for Select components
  const safeValue = value || undefined;

  return (
    <Select 
      value={safeValue} 
      onValueChange={onValueChange} 
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
};

export { SelectItem } from "./select";
