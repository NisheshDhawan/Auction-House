import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleStartBidding = () => {
    if (isAuthenticated) {
      navigate('/products');
    } else {
      navigate('/signup');
    }
  };

  const handleExploreAuctions = () => {
    if (isAuthenticated) {
      navigate('/products');
    } else {
      navigate('/signup');
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold mb-6 animate-fade-up-delayed">
            <span className="block text-foreground">Experience Live</span>
            <span className="block gradient-text">Auctions Like</span>
            <span className="block text-foreground">Never Before</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up-delayed-2">
            Bid, Win & Discover Unique Handmade & Virtual Creations in Real Time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up-delayed-2">
            <Button onClick={handleStartBidding} variant="hero" size="xl" className="group">
              Start Bidding
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button onClick={handleExploreAuctions} variant="heroOutline" size="xl">
              Explore Auctions
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "10K+", label: "Active Bidders" },
              { value: "5K+", label: "Unique Crafts" },
              { value: "99%", label: "Satisfaction" },
            ].map((stat, index) => (
              <div key={index} className="text-center animate-fade-up" style={{ animationDelay: `${0.6 + index * 0.1}s` }}>
                <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>


    </section>
  );
};

export default HeroSection;
