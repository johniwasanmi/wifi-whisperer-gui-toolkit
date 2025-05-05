
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, Lock, LockOpen, Users, AlertCircle } from "lucide-react";
import { Network } from "@/types/network";
import SignalStrengthIndicator from "./SignalStrengthIndicator";

interface NetworkCardProps {
  network: Network;
  onSelect: (network: Network) => void;
}

const NetworkCard = ({ network, onSelect }: NetworkCardProps) => {
  const getEncryptionColor = () => {
    switch (network.encryption) {
      case "WPA3":
        return "bg-green-600";
      case "WPA2":
        return "bg-blue-500";
      case "WPA":
        return "bg-yellow-500";
      case "WEP":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="hover:border-cyber-blue transition-all duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>{network.ssid || "Hidden Network"}</span>
              {network.ssid === "" && (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription>Channel: {network.channel}</CardDescription>
          </div>
          <SignalStrengthIndicator signal={network.signal} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4">
              {network.encryption === "OPEN" ? <LockOpen className="w-4 h-4 text-red-500" /> : <Lock className="w-4 h-4 text-green-500" />}
            </div>
            <span>{network.encryption}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{network.clients}</span>
          </div>
          <div className="col-span-2 font-mono text-xs text-muted-foreground">
            {network.bssid}
          </div>
          <div className="col-span-2 flex gap-1 mt-1">
            <Badge variant="outline">{network.vendor}</Badge>
            <Badge className={getEncryptionColor()}>{network.encryption}</Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onSelect(network)} 
          className="w-full bg-cyber-gray hover:bg-cyber-blue"
        >
          Select Network
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NetworkCard;
