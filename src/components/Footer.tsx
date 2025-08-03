
import React from 'react';
import { Music } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Music className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Afroverse
            </span>
          </div>
          <div className="flex space-x-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary">Privacy</Link>
            <Link to="/terms" className="hover:text-primary">Terms</Link>
            <Link to="/support" className="hover:text-primary">Support</Link>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground mt-4">
          © 2024 Afroverse. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
