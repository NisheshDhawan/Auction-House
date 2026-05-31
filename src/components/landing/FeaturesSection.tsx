import { useEffect, useRef, useState } from "react";
import { Zap, Palette, Calendar, MessageCircle, Bell, Shield } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Live Real-Time Bidding",
    description: "Instant bid updates with smooth transitions and real-time price changes",
  },
  {
    icon: Palette,
    title: "Craft Showcasing",
    description: "Beautiful product displays that highlight every detail of unique creations",
  },
  {
    icon: Calendar,
    title: "Auction Scheduling",
    description: "Easy setup for creators to plan and manage their auction events",
  },
  {
    icon: MessageCircle,
    title: "Interactive Experience",
    description: "Engaging, transparent auction environment with live chat and reactions",
  },
  {
    icon: Bell,
    title: "Notifications & Alerts",
    description: "Stay updated with bid changes and auction end alerts in real time",
  },
  {
    icon: Shield,
    title: "Secure & Smooth UX",
    description: "Fast, intuitive user experience with bank-grade security",
  },
];

const FeatureCard = ({ feature, index, isVisible }: { feature: typeof features[0]; index: number; isVisible: boolean }) => {
  const Icon = feature.icon;
  
  return (
    <div
      className={`glass-card p-6 hover-tilt cursor-pointer group transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-7 h-7 text-primary group-hover:text-accent transition-colors" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-foreground">{feature.title}</h3>
      <p className="text-muted-foreground">{feature.description}</p>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/5 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
};

const FeaturesSection = () => {
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
    <section id="features" ref={sectionRef} className="py-24 px-6 relative">
      <div className="container mx-auto max-w-6xl">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            Powerful <span className="gradient-text">Features</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need for a seamless auction experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
