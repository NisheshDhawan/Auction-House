import { useEffect, useRef, useState } from "react";

const AboutSection = () => {
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
    <section id="about" ref={sectionRef} className="py-24 px-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            <span className="gradient-text">Redefining</span> the Art of Auctions
          </h2>
          
          <div className="glass-card p-8 md:p-12">
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Our platform enables <span className="text-foreground font-medium">real-time bidding</span> for handmade & virtual crafts, 
              offering transparent live auctions with instant bid updates and engaging buyer–seller interaction. 
              We help artists reach a wider audience while ensuring <span className="text-foreground font-medium">fair pricing</span> through 
              competitive bidding—creating a vibrant marketplace where creativity meets opportunity.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
