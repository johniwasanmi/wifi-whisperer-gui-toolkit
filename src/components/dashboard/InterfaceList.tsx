
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, AlertCircle, MonitorPlay, Monitor } from "lucide-react";
import { wifiService, WifiInterface } from "@/services/wifiService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InterfaceListProps {
  onInterfaceSelect: (interfaceName: string) => void;
  selectedInterface: string;
  isScanning: boolean;
}

const InterfaceList = ({ onInterfaceSelect, selectedInterface, isScanning }: InterfaceListProps) => {
  const [interfaces, setInterfaces] = useState<WifiInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchInterfaces = async () => {
    setIsLoading(true);
    try {
      const data = await wifiService.getInterfaces();
      console.log("Interfaces data:", data); // Debug log
      setInterfaces(data);
    } catch (error) {
      console.error("Failed to fetch interfaces:", error);
      toast.error("Failed to load wireless interfaces");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterfaces();
    
    // Poll interfaces every 5 seconds to refresh their status
    const interval = setInterval(fetchInterfaces, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const startMonitorMode = async (interfaceName: string) => {
    setIsLoading(true);
    try {
      const result = await wifiService.startMonitorMode(interfaceName);
      
      if (result.success) {
        toast.success(result.message);
        // Immediately fetch interfaces to update status
        await fetchInterfaces();
        
        // Auto-select the monitor interface
        if (result.data?.monitorInterface) {
          onInterfaceSelect(result.data.monitorInterface);
        }
      } else {
        toast.error("Failed to start monitor mode: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error starting monitor mode:", error);
      toast.error("Error starting monitor mode");
    } finally {
      setIsLoading(false);
    }
  };

  const getModeIcon = (status: string) => {
    if (status === "monitor") return <MonitorPlay className="h-4 w-4 text-melon-green" />;
    return <Monitor className="h-4 w-4 text-melon-lightRed" />;
  };

  return (
    <Card className="bg-melon-darkGreen/5 border-melon-green/40 shadow-md h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-melon-green flex items-center gap-2 text-lg">
            <Wifi className="h-5 w-5" />
            Interfaces
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchInterfaces}
            disabled={isLoading}
            className="text-melon-darkGreen hover:text-melon-green hover:bg-melon-darkGreen/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-melon-gray">
          Available wireless adapters
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          {interfaces.length > 0 ? (
            <div className="space-y-3">
              {interfaces.map((iface) => (
                <div 
                  key={iface.name}
                  className={`p-3 rounded-md flex flex-col ${
                    selectedInterface === iface.name 
                      ? 'bg-melon-green/15 border border-melon-green/40' 
                      : 'bg-background/70 border border-border/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {getModeIcon(iface.status)}
                      <span className="font-medium">{iface.name}</span>
                      <Badge 
                        variant={iface.status === "monitor" ? "outline" : "secondary"}
                        className={iface.status === "monitor" ? "border-melon-green text-melon-green" : ""}
                      >
                        {iface.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <div>
                      <span className="font-semibold">Driver:</span> {iface.driver}
                    </div>
                    <div>
                      <span className="font-semibold">Chipset:</span> {iface.chipset}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end gap-2">
                    {iface.status === "monitor" ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-melon-green text-white hover:bg-melon-darkGreen"
                        disabled={isScanning}
                        onClick={() => onInterfaceSelect(iface.name)}
                      >
                        Select for Scanning
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-melon-green/50 text-melon-darkGreen hover:bg-melon-green/10"
                        disabled={isLoading || isScanning}
                        onClick={() => startMonitorMode(iface.name)}
                      >
                        Enable Monitor Mode
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertCircle className="h-8 w-8 text-melon-red mb-2" />
              <h3 className="font-medium">No interfaces found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isLoading ? "Loading interfaces..." : "Please connect a wireless adapter"}
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default InterfaceList;
