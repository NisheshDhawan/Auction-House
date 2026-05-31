import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gavel, Menu, X } from "lucide-react";

const AuthNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (link: string) => {
    const sectionId = link.toLowerCase().replace(/\s+/g, "-");
    
    // Navigate to home page first, then scroll
    navigate('/');
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    setIsMobileMenuOpen(false);
  };

  const navLinks = ["Auctions", "Features", "How It Works", "About"];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-black/5 shadow-lg">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/20 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-serif font-bold text-black">Auction House</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link}
                onClick={() => handleNavClick(link)}
                className="text-sm text-black/70 hover:text-black transition-colors font-medium"
              >
                {link}
              </button>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-black hover:text-black/80 hover:bg-black/5">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-black hover:bg-black/90 text-white">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-black hover:text-black/80 hover:bg-black/5"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-sm border border-black/10 rounded-2xl mt-2 p-6 animate-scale-in shadow-xl">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link}
                  onClick={() => handleNavClick(link)}
                  className="text-black hover:text-black/70 transition-colors py-2 font-medium text-left"
                >
                  {link}
                </button>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-black/10">
                <Link to="/login">
                  <Button variant="ghost" className="w-full text-black hover:text-black/80 hover:bg-black/5">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button className="w-full bg-black hover:bg-black/90 text-white">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default AuthNavbar;
