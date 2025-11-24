import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../UnifiedFolder/ui/card';
import { Leaf, Lightbulb, Recycle } from 'lucide-react';

// Shared sustainability tips that can be used across all files
export const sustainabilityTips = [
  {
    tip: 'Store fruits and vegetables separately! Ethylene gas from ripening fruits can cause vegetables to spoil faster.',
    impact: 'This could save 20% more food from waste!'
  },
  {
    tip: 'Bring reusable bags to reduce plastic waste during food distributions.',
    impact: 'Reduces plastic waste by up to 90% per distribution!'
  },
  {
    tip: 'Sort food items by expiration date to ensure first-expired, first-out distribution.',
    impact: 'Prevents 30% of food from being wasted due to improper rotation!'
  },
  {
    tip: 'Use proper cold storage to maintain food quality and extend shelf life.',
    impact: 'Extends food freshness by 2-3 days on average!'
  },
  {
    tip: 'Plan meals around available surplus food to maximize utilization.',
    impact: 'Reduces food waste by 25% through better planning!'
  },
  {
    tip: 'Compost food scraps to create nutrient-rich soil for community gardens.',
    impact: 'Diverts 100% of food scraps from landfills!'
  },
  {
    tip: 'Label donation bags with clear allergen and storage information.',
    impact: 'Helps prevent 15% of food safety issues!'
  },
  {
    tip: 'Use efficient transportation routes to reduce carbon footprint.',
    impact: 'Cuts transportation emissions by up to 40%!'
  },
  {
    tip: 'Organize carpools for food distribution to reduce vehicle usage.',
    impact: 'Reduces carbon emissions by 50% per trip!'
  },
  {
    tip: 'Partner with local farms for direct produce sourcing.',
    impact: 'Reduces food miles by 75% on average!'
  }
];

interface SustainabilityTipCardProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function SustainabilityTipCard({ 
  className = '', 
  variant = 'default' 
}: SustainabilityTipCardProps) {
  const [currentTip, setCurrentTip] = useState<{ tip: string; impact: string } | null>(null);

  useEffect(() => {
    // Set random tip on component mount
    const randomTip = sustainabilityTips[Math.floor(Math.random() * sustainabilityTips.length)];
    setCurrentTip(randomTip);

    // Optionally change tip every hour
    const interval = setInterval(() => {
      const newTip = sustainabilityTips[Math.floor(Math.random() * sustainabilityTips.length)];
      setCurrentTip(newTip);
    }, 60 * 60 * 1000); // Change every hour

    return () => clearInterval(interval);
  }, []);

  const getRandomTip = () => {
    const randomTip = sustainabilityTips[Math.floor(Math.random() * sustainabilityTips.length)];
    setCurrentTip(randomTip);
  };

  if (!currentTip) return null;

  if (variant === 'compact') {
    return (
      <Card className={`shadow-sm border-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-4 w-4 text-green-200" />
                <h3 className="font-semibold text-sm">Sustainability Tip</h3>
              </div>
              <p className="text-green-100 text-xs mb-3 line-clamp-2">
                {currentTip.tip}
              </p>
              <div className="flex items-center gap-1 text-green-200 text-xs">
                <Lightbulb className="h-3 w-3" />
                <span className="line-clamp-1">{currentTip.impact}</span>
              </div>
            </div>
            <Recycle className="h-8 w-8 text-green-200 ml-3 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-sm border-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-5 w-5 text-green-200" />
              <h3 className="font-semibold">Sustainability Tip</h3>
            </div>
            <p className="text-green-100 text-sm mb-4">
              {currentTip.tip}
            </p>
            <div className="flex items-center gap-1 text-green-200 text-xs">
              <Lightbulb className="h-3 w-3" />
              <span>{currentTip.impact}</span>
            </div>
            <button 
              onClick={getRandomTip}
              className="text-green-200 hover:text-white text-xs mt-3 underline transition-colors"
            >
              Show another tip
            </button>
          </div>
          <Recycle className="h-12 w-12 text-green-200 ml-4 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}