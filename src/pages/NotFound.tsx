
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-melody-dark p-4">
      <div className="text-center max-w-md">
        <Music className="h-16 w-16 mx-auto mb-6 text-melody-secondary" />
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! We couldn't find that page.</p>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for doesn't seem to exist in our musical universe.
        </p>
        <Link to="/">
          <Button className="bg-melody-secondary hover:bg-melody-secondary/90">
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
