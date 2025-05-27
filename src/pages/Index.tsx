
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Disc, Music2, Wand2, Award } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      <header className="bg-melody-dark border-b border-border/30 p-4">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Music className="h-6 w-6 text-melody-secondary" />
            <span className="font-montserrat font-bold text-xl">Afroverse</span>
          </div>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button variant="default">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24 px-4">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-melody-secondary to-melody-accent bg-clip-text text-transparent">
                Create Music with AI
              </h1>
              <p className="text-xl mb-8">
                Generate professional songs and instrumentals in seconds with just a text description.
              </p>
              <Link to="/register">
                <Button size="lg" className="bg-melody-secondary hover:bg-melody-secondary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-melody-primary/10">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
                <div className="h-16 w-16 rounded-full bg-melody-secondary/20 flex items-center justify-center mb-4">
                  <Music2 className="h-8 w-8 text-melody-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-2">1. Choose Your Style</h3>
                <p className="text-muted-foreground">Select from popular music genres like Afrobeats, R&B, or Pop.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
                <div className="h-16 w-16 rounded-full bg-melody-secondary/20 flex items-center justify-center mb-4">
                  <Wand2 className="h-8 w-8 text-melody-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-2">2. Describe Your Song</h3>
                <p className="text-muted-foreground">Tell us what you want your song to be about in a few words.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card">
                <div className="h-16 w-16 rounded-full bg-melody-secondary/20 flex items-center justify-center mb-4">
                  <Disc className="h-8 w-8 text-melody-secondary" />
                </div>
                <h3 className="text-xl font-bold mb-2">3. Generate & Enjoy</h3>
                <p className="text-muted-foreground">Our AI creates your unique song that you can save, share, and download.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block p-2 rounded-full bg-melody-accent/20 text-melody-accent mb-4">
                <Award className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold mb-6">Join Our Music Contest</h2>
              <p className="text-lg mb-8">
                Showcase your talent in our quarterly music contests. Upload your entries, get votes, and win amazing prizes including record deals!
              </p>
              <Link to="/register">
                <Button variant="outline" size="lg" className="border-melody-secondary text-melody-secondary hover:bg-melody-secondary/10">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-melody-primary/10">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-8">Ready to Create Music?</h2>
            <Link to="/register">
              <Button size="lg" className="bg-melody-secondary hover:bg-melody-secondary/90">
                Sign Up Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-melody-dark border-t border-border/30 py-8 px-4">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Music className="h-5 w-5 text-melody-secondary" />
              <span className="font-montserrat font-bold">Afroverse</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 Afroverse AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
