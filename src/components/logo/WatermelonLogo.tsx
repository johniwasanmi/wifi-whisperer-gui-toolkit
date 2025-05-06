
import React from "react";
import { Wifi } from "lucide-react";

interface WatermelonLogoProps {
  size?: number;
  className?: string;
}

const WatermelonLogo: React.FC<WatermelonLogoProps> = ({ size = 40, className }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Watermelon slice */}
      <div 
        className="absolute top-0 left-0 w-full h-full bg-melon-green rounded-tl-full rounded-tr-full overflow-hidden"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 80%, 0 80%)" }}
      >
        {/* Inner pink part */}
        <div 
          className="absolute top-[10%] left-[10%] w-[80%] h-[80%] bg-melon-red rounded-tl-full rounded-tr-full"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 80%, 0 80%)" }}
        >
          {/* Seeds */}
          <div className="watermelon-seed" style={{ top: '30%', left: '30%' }}></div>
          <div className="watermelon-seed" style={{ top: '50%', left: '60%' }}></div>
          <div className="watermelon-seed" style={{ top: '70%', left: '40%' }}></div>
        </div>
        
        {/* WiFi signal */}
        <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2">
          <Wifi size={size * 0.5} className="text-white" />
        </div>
      </div>
    </div>
  );
};

export default WatermelonLogo;
