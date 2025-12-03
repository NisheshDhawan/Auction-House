import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    content: "This platform transformed how I sell my handmade ceramics. The live auction format creates such excitement and I've connected with collectors I never would have reached otherwise.",
    author: "Sarah Chen",
    role: "Ceramic Artist",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
  },
  {
    id: 2,
    content: "As a digital artist, finding the right marketplace was challenging. Here, my NFTs and virtual creations get the attention they deserve through transparent, real-time bidding.",
    author: "Marcus Rivera",
    role: "Digital Artist",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
  },
  {
    id: 3,
    content: "The thrill of live bidding is addictive! I've discovered amazing one-of-a-kind pieces and love knowing I'm supporting independent artists directly.",
    author: "Emma Thompson",
    role: "Art Collector",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
  },
];

const TestimonialsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section ref={sectionRef} className="py-24 px-6 relative overflow-hidden">
      <div className="container mx-auto max-w-4xl">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            What People <span className="gradient-text">Say</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Hear from our community of artists and collectors
          </p>
        </div>

        <div className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="glass-card p-8 md:p-12 relative">
            {/* Quote Icon */}
            <Quote className="w-12 h-12 text-primary/20 absolute top-8 left-8" />

            {/* Testimonial Content */}
            <div className="relative z-10 text-center">
              <p className="text-xl md:text-2xl text-foreground leading-relaxed mb-8 font-light italic">
                "{testimonials[currentIndex].content}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-center gap-4">
                <img
                  src={testimonials[currentIndex].avatar}
                  alt={testimonials[currentIndex].author}
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                />
                <div className="text-left">
                  <p className="font-semibold text-foreground">{testimonials[currentIndex].author}</p>
                  <p className="text-sm text-muted-foreground">{testimonials[currentIndex].role}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-center gap-4 mt-8">
              <Button variant="glass" size="icon" onClick={prevSlide}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex ? 'w-6 bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <Button variant="glass" size="icon" onClick={nextSlide}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
