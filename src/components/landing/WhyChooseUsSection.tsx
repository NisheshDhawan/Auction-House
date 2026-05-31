import { useEffect, useRef, useState } from "react";
import { Activity, Rocket, Lock } from "lucide-react";
import { RupeeIcon } from '@/components/ui/rupee-icon';

const pillars = [
  {
    icon: Activity,
    title: "Real-time Engagement",
    description: "Experience the thrill of live auctions with instant updates and interactive features",
    gradient: "from-primary to-primary/50",
  },
  {
    icon: RupeeIcon,
    title: "Fair Pricing",
    description: "Competitive bidding ensures fair market value for every unique creation",
    gradient: "from-accent to-accent/50",
  },
  {
    icon: Rocket,
    title: "Boost for Creators",
    description: "Empowering artists to reach global audiences and maximize their potential",
    gradient: "from-secondary to-secondary/50",
  },
  {
    icon: Lock,
    title: "Transparent & Secure",
    description: "Every bid is verified and every transaction is protected by enterprise security",
    gradient: "from-green-500 to-green-500/50",
  },
];

const WhyChooseUsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            Why Choose <span className="gradient-text">Us</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The pillars that make our platform stand out
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div
                key={index}
                className={`text-center group transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Icon */}
                <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${pillar.gradient} p-[1px] group-hover:scale-110 transition-transform duration-300`}>
                  <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
                    <Icon className="w-9 h-9 text-foreground" />
                  </div>
                </div>

                {/* Vertical Line */}
                <div className={`w-px h-12 mx-auto mb-6 bg-gradient-to-b ${pillar.gradient} opacity-50`} />

                <h3 className="text-xl font-semibold mb-3">{pillar.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
