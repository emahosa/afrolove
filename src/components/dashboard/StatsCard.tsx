
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  variant?: 'primary' | 'default';
}

const StatsCard = ({ title, value, icon, description, variant = 'default' }: StatsCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium">{title}</h3>
          {icon}
        </div>
        <div>
          <div className={`text-2xl font-bold ${variant === 'primary' ? 'text-primary' : ''}`}>
            {value}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
