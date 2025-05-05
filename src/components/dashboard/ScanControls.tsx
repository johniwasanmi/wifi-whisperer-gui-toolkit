
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, Loader2, WifiOff } from "lucide-react";

interface ScanControlsProps {
  onStartScan: (interface: string) => void;
  onStopScan: () => void;
  isScanning: boolean;
}

const ScanControls = ({ onStartScan, onStopScan, isScanning }: ScanControlsProps) => {
  const [selectedInterface, setSelectedInterface] = useState<string>("");
  const interfaces = ["wlan0", "wlan1", "mon0"];

  return (
    <Card className="bg-cyber-dark border-cyber-gray">
      <CardHeader>
        <CardTitle className="text-cyber-blue flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Network Scanner
        </CardTitle>
        <CardDescription>
          Discover wireless networks in your vicinity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Interface</label>
          <Select
            disabled={isScanning}
            value={selectedInterface}
            onValueChange={setSelectedInterface}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interface" />
            </SelectTrigger>
            <SelectContent>
              {interfaces.map((iface) => (
                <SelectItem key={iface} value={iface}>
                  {iface}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          {isScanning && (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full bg-cyber-blue opacity-75 animate-pulse"></div>
              <div className="signal-ripple"></div>
              <div className="signal-ripple" style={{ animationDelay: "0.5s" }}></div>
            </div>
          )}
          {isScanning && <span className="text-sm text-cyber-blue">Scanning networks...</span>}
        </div>
      </CardContent>
      <CardFooter>
        {!isScanning ? (
          <Button
            onClick={() => onStartScan(selectedInterface)}
            disabled={!selectedInterface}
            className="w-full bg-cyber-blue hover:bg-blue-600 text-black"
          >
            <Wifi className="mr-2 h-4 w-4" />
            Start Scanning
          </Button>
        ) : (
          <Button
            onClick={onStopScan}
            variant="destructive"
            className="w-full"
          >
            <WifiOff className="mr-2 h-4 w-4" />
            Stop Scanning
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ScanControls;
