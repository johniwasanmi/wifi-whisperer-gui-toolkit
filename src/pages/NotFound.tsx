
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-darker">
      <div className="text-center space-y-6 p-8">
        <div className="text-9xl font-bold text-cyber-blue">404</div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          The resource you are trying to access does not exist or you do not have sufficient permissions.
        </p>
        <Button asChild className="mt-6 bg-cyber-blue hover:bg-blue-600 text-black">
          <Link to="/">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
