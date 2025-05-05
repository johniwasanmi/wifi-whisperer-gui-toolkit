
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, Loader2, WifiOff, RefreshCw } from "lucide-react";
import { wifiService, WifiInterface } from "@/services/wifiService";
import { toast } from "sonner";

interface ScanControlsProps {
  onStartScan: (interfaceName: string) => void;
  onStopScan: () => void;
  isScanning: boolean;
}

const ScanControls = ({ onStartScan, onStopScan, isScanning }: ScanControlsProps) => {
  const [selectedInterface, setSelectedInterface] = useState<string>("");
  const [interfaces, setInterfaces] = useState<WifiInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchInterfaces = async () => {
    setIsLoading(true);
    try {
      const data = await wifiService.getInterfaces();
      setInterfaces(data);
      
      // Auto-select monitor interfaces if available
      const monitorInterface = data.find(iface => iface.status === "monitor");
      if (monitorInterface) {
        setSelectedInterface(monitorInterface.name);
      } else if (data.length > 0) {
        setSelectedInterface(data[0].name);
      }
      
    } catch (error) {
      console.error("Failed to fetch interfaces:", error);
      toast.error("Failed to load wireless interfaces");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterfaces();
  }, []);

  const startMonitorMode = async () => {
    if (!selectedInterface) return;
    
    setIsLoading(true);
    try {
      const result = await wifiService.startMonitorMode(selectedInterface);
      
      if (result.success) {
        toast.success(result.message);
        fetchInterfaces(); // Refresh interfaces
      } else {
        toast.error("Failed to start monitor mode");
      }
    } catch (error) {
      console.error("Error starting monitor mode:", error);
      toast.error("Error starting monitor mode");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-cyber-dark border-cyber-gray">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-cyber-blue flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Network Scanner
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchInterfaces}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Discover wireless networks in your vicinity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Interface</label>
          <Select
            disabled={isScanning || isLoading}
            value={selectedInterface}
            onValueChange={setSelectedInterface}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interface" />
            </SelectTrigger>
            <SelectContent>
              {interfaces.map((iface) => (
                <SelectItem key={iface.name} value={iface.name}>
                  {iface.name} {iface.status === "monitor" ? "(Monitor Mode)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedInterface && interfaces.find(i => i.name === selectedInterface)?.status !== "monitor" && (
          <div className="pt-2">
            <Button 
              onClick={startMonitorMode}
              disabled={isLoading || isScanning} 
              variant="outline" 
              className="w-full text-xs"
            >
              {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              Enable Monitor Mode
            </Button>
          </div>
        )}
        
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
            disabled={!selectedInterface || isLoading}
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
