import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, TrendingUp } from "lucide-react";

const auctions = [
  {
    id: 1,
    title: "Ethereal Ceramic Vase",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop",
    basePrice: 120,
    currentBid: 285,
    status: "Live Now",
    statusColor: "bg-green-500",
    bids: 23,
  },
  {
    id: 2,
    title: "Digital Abstract Portrait",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=400&fit=crop",
    basePrice: 80,
    currentBid: 156,
    status: "Ending Soon",
    statusColor: "bg-accent",
    bids: 15,
  },
  {
    id: 3,
    title: "Handwoven Tapestry",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    basePrice: 200,
    currentBid: 445,
    status: "Live Now",
    statusColor: "bg-green-500",
    bids: 31,
  },
  {
    id: 4,
    title: "3D Printed Sculpture",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop",
    basePrice: 150,
    currentBid: 312,
    status: "Live Now",
    statusColor: "bg-green-500",
    bids: 19,
  },
];

const AuctionCard = ({ auction, index, isVisible }: { auction: typeof auctions[0]; index: number; isVisible: boolean }) => {
  return (
    <div
      className={`glass-card overflow-hidden group cursor-pointer transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={auction.image}
          alt={auction.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <Badge className={`${auction.statusColor} text-foreground border-0 flex items-center gap-1`}>
            <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
            {auction.status}
          </Badge>
        </div>

        {/* Bid Count */}
        <div className="absolute top-4 right-4 glass-card px-3 py-1 text-sm">
          <TrendingUp className="w-3 h-3 inline mr-1" />
          {auction.bids} bids
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors">
          {auction.title}
        </h3>
        
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Base Price</p>
            <p className="text-sm line-through text-muted-foreground">${auction.basePrice}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Current Bid</p>
            <p className="text-2xl font-bold gradient-text">${auction.currentBid}</p>
          </div>
        </div>

        <Button variant="glass" className="w-full mt-4 group-hover:bg-primary/20">
          <Timer className="w-4 h-4 mr-2" />
          Place Bid
        </Button>
      </div>
    </div>
  );
};

const TrendingAuctionsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 relative">
      <div className="container mx-auto max-w-6xl">
        <div className={`flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Trending <span className="gradient-text">Auctions</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Don't miss out on these hot items
            </p>
          </div>
          <Button variant="heroOutline" size="lg">
            View All Auctions
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {auctions.map((auction, index) => (
            <AuctionCard key={auction.id} auction={auction} index={index} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingAuctionsSection;
