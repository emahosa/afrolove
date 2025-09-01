
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Music, DollarSign } from 'lucide-react';
import { Producer } from '@/types/producer';

interface ProducerCardProps {
  producer: Producer;
  onSelect: (producer: Producer) => void;
}

export const ProducerCard = ({ producer, onSelect }: ProducerCardProps) => {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">
              {producer.business_name || producer.profile?.full_name || 'Producer'}
            </h3>
            <p className="text-sm text-muted-foreground">@{producer.profile?.username}</p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{producer.rating.toFixed(1)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{producer.total_jobs} completed jobs</span>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              ${(producer.min_price_credits * 0.01).toFixed(0)} - ${(producer.max_price_credits * 0.01).toFixed(0)}
            </span>
          </div>

          {producer.portfolio_tracks && producer.portfolio_tracks.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Portfolio:</p>
              <div className="flex flex-wrap gap-1">
                {producer.portfolio_tracks.slice(0, 3).map((track, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    Track {index + 1}
                  </Badge>
                ))}
                {producer.portfolio_tracks.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{producer.portfolio_tracks.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-6 pt-0">
        <Button 
          onClick={() => onSelect(producer)}
          className="w-full"
        >
          Select Producer
        </Button>
      </CardFooter>
    </Card>
  );
};
