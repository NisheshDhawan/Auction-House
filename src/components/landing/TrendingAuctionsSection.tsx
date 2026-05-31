import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, TrendingUp, RefreshCw } from "lucide-react";
import { listingsAPI, Listing } from "@/services/listingsAPI";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import { ImageDisplay } from "@/components/ui/image-display";

interface TrendingAuction {
  id: string;
  title: string;
  image: string;
  basePrice: number;
  currentBid: number;
  status: string;
  statusColor: string;
  bids: number;
  endDate: string;
}

// Curated fallback images for different categories
const getFallbackImage = (productName: string, category?: string): string => {
  const fallbackImages = [
    "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop", // Ceramic vase
    "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=400&fit=crop", // Abstract art
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop", // Textiles
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop", // Sculpture
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop", // Jewelry
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop", // Vintage items
    "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop", // Books
    "https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=400&h=400&fit=crop", // Art supplies
  ];
  
  // Use product name hash to consistently get the same image for the same product
  const hash = productName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return fallbackImages[Math.abs(hash) % fallbackImages.length];
};

// Helper function to convert listing to trending auction format
const convertListingToAuction = (listing: Listing): TrendingAuction => {
  const getStatusInfo = (status: string, endDateTime: string) => {
    const now = new Date();
    const end = new Date(endDateTime);
    const timeLeft = end.getTime() - now.getTime();
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    
    if (status === 'active') {
      if (hoursLeft <= 2) {
        return { status: "Ending Soon", color: "bg-red-500" };
      } else if (listing.totalBids > 20) {
        return { status: "Hot Bid", color: "bg-orange-500" };
      } else {
        return { status: "Live Now", color: "bg-green-500" };
      }
    } else if (status === 'listed' || status === 'pending') {
      return { status: "Starting Soon", color: "bg-blue-500" };
    } else if (status === 'ended') {
      // Make ended auctions look more appealing
      if (listing.totalBids > 10) {
        return { status: "Popular", color: "bg-purple-500" };
      } else if (listing.totalBids > 5) {
        return { status: "Trending", color: "bg-indigo-500" };
      } else {
        return { status: "Recently Sold", color: "bg-emerald-500" };
      }
    } else {
      return { status: "Available", color: "bg-gray-500" };
    }
  };
  
  const statusInfo = getStatusInfo(listing.status, listing.endDateTime);
  
  // Use the product image directly - the ImageDisplay component will handle fallbacks
  const imageUrl = listing.productImage || getFallbackImage(listing.productName);
  
  return {
    id: listing.id,
    title: listing.productName,
    image: imageUrl,
    basePrice: listing.basePrice,
    currentBid: listing.currentBid || listing.basePrice,
    status: statusInfo.status,
    statusColor: statusInfo.color,
    bids: listing.totalBids || 0,
    endDate: listing.endDateTime,
  };
};

// Helper function to get random items (keeping for fallback)
const getRandomItems = <T,>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const AuctionCard = ({ auction, index, isVisible }: { auction: TrendingAuction; index: number; isVisible: boolean }) => {
  const isSold = ["Recently Sold", "Popular", "Trending"].includes(auction.status) ||
    (auction.endDate && new Date(auction.endDate) < new Date());

  return (
    <div
      className={`glass-card overflow-hidden group cursor-pointer transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        <ImageDisplay
          imageId={auction.image}
          alt={auction.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          fallbackClassName="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
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

        {/* Image Source Indicator */}
        <div className="absolute bottom-4 left-4">
          <Badge variant="outline" className="bg-background/80 text-xs">
            📷 Product Image
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2">
          {auction.title}
        </h3>
        
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Base Price</p>
            <p className="text-sm line-through text-muted-foreground">Rs {auction.basePrice.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Current Bid</p>
            <p className="text-2xl font-bold gradient-text">Rs {auction.currentBid.toLocaleString()}</p>
          </div>
        </div>

        {/* Countdown Timer - only for active/live auctions */}
        {!isSold && auction.endDate && (
          <div className="mb-4 p-3 glass-card border-primary/20 bg-primary/5">
            <CountdownTimer 
              endDate={auction.endDate}
              size="md"
              className="justify-center"
            />
          </div>
        )}

        {/* Place Bid - only for active/live auctions */}
        {!isSold && (
          <Button variant="glass" className="w-full group-hover:bg-primary/20">
            <Timer className="w-4 h-4 mr-2" />
            Place Bid
          </Button>
        )}
      </div>
    </div>
  );
};

const TrendingAuctionsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [auctions, setAuctions] = useState<TrendingAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  // Fetch real auction listings from database
  const fetchTrendingAuctions = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('Fetching trending auctions...');
      
      // First, update auction statuses to ensure they're current
      try {
        console.log('Updating auction statuses...');
        const updateResult = await listingsAPI.updateAuctionStatuses();
        console.log('Status update result:', updateResult);
      } catch (updateError) {
        console.warn('Failed to update auction statuses:', updateError);
      }
      
      // Fetch all listings first to show something
      console.log('Fetching all listings...');
      const allResponse = await listingsAPI.getListings();
      console.log('All listings response:', allResponse);
      
      if (allResponse.listings.length > 0) {
        // Prioritize listings with higher bid counts for "trending" display
        // Sort by: 1) Total bids (descending), 2) Current bid amount (descending), 3) Recent creation (descending)
        const trendingListings = allResponse.listings
          .sort((a, b) => {
            // First priority: listings with more bids
            if (b.totalBids !== a.totalBids) {
              return b.totalBids - a.totalBids;
            }
            // Second priority: higher current bid
            if (b.currentBid !== a.currentBid) {
              return b.currentBid - a.currentBid;
            }
            // Third priority: more recent
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .slice(0, 4);
        
        console.log('Trending listings (sorted by bid activity):', trendingListings);
        const trendingAuctions = trendingListings.map(convertListingToAuction);
        console.log('Converted trending auctions:', trendingAuctions);
        setAuctions(trendingAuctions);
      } else {
        console.log('No listings found at all');
        setAuctions([]);
      }
    } catch (error) {
      console.error('Failed to fetch trending auctions:', error);
      setAuctions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrendingAuctions();
    // Removed auto-refresh interval - now manual only
  }, []);

  return (
    <section id="auctions" ref={sectionRef} className="py-24 px-6 relative">
      <div className="container mx-auto max-w-6xl">
        <div className={`flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Trending <span className="gradient-text">Auctions</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Discover the most popular and active auctions
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => fetchTrendingAuctions(true)} 
              variant="glass" 
              size="lg"
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button onClick={() => { navigate('/products'); window.scrollTo(0, 0); }} variant="heroOutline" size="lg">
              View All Auctions
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="glass-card h-80 animate-pulse">
                <div className="h-64 bg-muted rounded-t-2xl"></div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : auctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {auctions.map((auction, index) => (
              <AuctionCard key={auction.id} auction={auction} index={index} isVisible={isVisible} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No trending auctions available at the moment.</p>
            <Button onClick={() => navigate('/products')} variant="heroOutline" className="mt-4">
              Browse All Products
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingAuctionsSection;
