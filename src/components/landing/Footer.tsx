import { Gavel, Instagram, Twitter, Facebook, Linkedin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Footer = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const footerLinks = {
    Platform: ["How It Works", "Features", "Pricing", "FAQ"],
    Creators: ["Start Selling", "Creator Guide", "Success Stories", "Support"],
    Company: ["About Us", "Careers", "Blog", "Press"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"],
  };

  const socialLinks = [
    { icon: Instagram, name: "Instagram" },
    { icon: Twitter, name: "Twitter" },
    { icon: Facebook, name: "Facebook" },
    { icon: Linkedin, name: "LinkedIn" },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
    e.preventDefault();
    
    // Mapping for landing page sections
    const sectionMapping: Record<string, string> = {
      "How It Works": "how-it-works",
      "Features": "features",
      "About Us": "about",
    };

    if (sectionMapping[link]) {
      const sectionId = sectionMapping[link];
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
      return;
    }

    // Mapping for app pages
    if (link === "Start Selling") {
      if (isAuthenticated) {
        navigate('/manage-products');
      } else {
        navigate('/signup');
      }
      return;
    }

    // Default: show coming soon toast
    toast({
      title: `${link} coming soon!`,
      description: "We are currently preparing this section. Check back soon!",
    });
  };

  return (
    <footer className="py-16 px-6 border-t border-border/50">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Gavel className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-serif font-bold">Auction House</span>
            </div>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              The premier live auction platform for handmade and virtual crafts. 
              Connecting creators with collectors worldwide.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      toast({
                        title: `${social.name} coming soon!`,
                        description: "Our social media channels will be live soon.",
                      });
                    }}
                    className="w-10 h-10 rounded-lg glass-card flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4 text-foreground">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      onClick={(e) => handleLinkClick(e, link)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Auction House. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with passion for creators everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
