import { Gavel, Instagram, Twitter, Facebook, Linkedin } from "lucide-react";

const Footer = () => {
  const footerLinks = {
    Platform: ["How It Works", "Features", "Pricing", "FAQ"],
    Creators: ["Start Selling", "Creator Guide", "Success Stories", "Support"],
    Company: ["About Us", "Careers", "Blog", "Press"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"],
  };

  const socialLinks = [
    { icon: Instagram, href: "#" },
    { icon: Twitter, href: "#" },
    { icon: Facebook, href: "#" },
    { icon: Linkedin, href: "#" },
  ];

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
                    href={social.href}
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
            © 2025 Auction House. All rights reserved.
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
