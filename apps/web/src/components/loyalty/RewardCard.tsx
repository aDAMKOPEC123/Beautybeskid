// filepath: apps/web/src/components/loyalty/RewardCard.tsx
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';

interface RewardCardProps {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  userPoints: number;
  onRedeem: (id: string) => void;
}

export const RewardCard = ({ id, name, description, pointsCost, userPoints, onRedeem }: RewardCardProps) => {
  const canAfford = userPoints >= pointsCost;

  return (
    <Card className="flex flex-col h-full border hover:border-primary/50 hover:shadow-md transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg text-primary">{name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 text-sm text-muted-foreground leading-relaxed">
        {description}
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-muted/10 py-4 mt-2">
        <span className="font-bold text-lg text-foreground">{pointsCost} <span className="text-sm font-normal text-muted-foreground">pkt</span></span>
        <Button 
          onClick={() => onRedeem(id)} 
          disabled={!canAfford}
          variant={canAfford ? 'default' : 'secondary'}
          className={canAfford ? "shadow-md" : ""}
        >
          Aktywuj kupon
        </Button>
      </CardFooter>
    </Card>
  );
};
