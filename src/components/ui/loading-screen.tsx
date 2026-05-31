import { Loader2 } from 'lucide-react';
import { Card, CardContent } from './card';

interface LoadingScreenProps {
  title?: string;
  description?: string;
}

export const LoadingScreen = ({ 
  title = "Loading", 
  description = "Please wait..." 
}: LoadingScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="glass-card p-8 w-96 text-center animate-scale-in">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary glow-effect" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};