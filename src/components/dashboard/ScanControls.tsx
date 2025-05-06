
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, Loader2, WifiOff, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ScanControlsProps {
  onStartScan: (options: ScanOptions) => void;
  onStopScan: () => void;
  isScanning: boolean;
  selectedInterface: string;
  interfaceInMonitorMode: boolean;
}

export interface ScanOptions {
  interfaceName: string;
  channel?: number | number[];
  writeCapture?: boolean;
  beacons?: boolean;
  updateInterval?: number;
}

const ScanControls = ({ 
  onStartScan, 
  onStopScan, 
  isScanning, 
  selectedInterface, 
  interfaceInMonitorMode 
}: ScanControlsProps) => {
  const [scanOptions, setScanOptions] = useState<ScanOptions>({
    interfaceName: selectedInterface,
    channel: 0, // 0 = all channels
    writeCapture: true,
    beacons: true,
    updateInterval: 1 // seconds
  });

  const handleStartScan = () => {
    if (!selectedInterface) {
      toast.error("Please select an interface first");
      return;
    }
    
    if (!interfaceInMonitorMode) {
      toast.error("Selected interface must be in monitor mode for scanning");
      return;
    }
    
    onStartScan({
      ...scanOptions,
      interfaceName: selectedInterface
    });
  };

  return (
    <Card className="bg-melon-darkGreen/5 border-melon-green/40 shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-melon-green flex items-center gap-2 text-lg">
            <Wifi className="h-5 w-5" />
            Scan Controls
          </CardTitle>
        </div>
        <CardDescription className="text-melon-gray">
          Configure network discovery parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="selected-interface">Selected Interface</Label>
            <span className={`text-sm font-mono ${
              interfaceInMonitorMode ? 'text-melon-green' : 'text-melon-red'
            }`}>
              {selectedInterface || 'None'}
              {selectedInterface && !interfaceInMonitorMode && " (Not in monitor mode)"}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="channel">Channel</Label>
            <span className="text-sm">
              {scanOptions.channel === 0 ? 'All' : scanOptions.channel}
            </span>
          </div>
          <Slider
            id="channel"
            disabled={isScanning}
            value={[scanOptions.channel as number]}
            min={0}
            max={14}
            step={1}
            onValueChange={(value) => setScanOptions({ ...scanOptions, channel: value[0] })}
            className="mt-2"
          />
        </div>
        
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="write-capture" className="flex-grow">Save capture file</Label>
          <Switch
            id="write-capture"
            disabled={isScanning}
            checked={scanOptions.writeCapture}
            onCheckedChange={(checked) => setScanOptions({ ...scanOptions, writeCapture: checked })}
          />
        </div>
        
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="show-beacons" className="flex-grow">Record beacons</Label>
          <Switch
            id="show-beacons"
            disabled={isScanning}
            checked={scanOptions.beacons}
            onCheckedChange={(checked) => setScanOptions({ ...scanOptions, beacons: checked })}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="update-interval">Update interval (s)</Label>
            <span className="text-sm">{scanOptions.updateInterval}s</span>
          </div>
          <Slider
            id="update-interval"
            disabled={isScanning}
            value={[scanOptions.updateInterval]}
            min={1}
            max={5}
            step={1}
            onValueChange={(value) => setScanOptions({ ...scanOptions, updateInterval: value[0] })}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          {isScanning && (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full bg-melon-red opacity-75 animate-pulse"></div>
              <div className="signal-ripple border-melon-red"></div>
              <div className="signal-ripple border-melon-red" style={{ animationDelay: "0.5s" }}></div>
            </div>
          )}
          {isScanning && <span className="text-sm text-melon-red">Scanning networks...</span>}
        </div>
      </CardContent>
      <CardFooter>
        {!isScanning ? (
          <Button
            onClick={handleStartScan}
            disabled={!selectedInterface || !interfaceInMonitorMode}
            className="w-full bg-melon-green hover:bg-melon-darkGreen text-white"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Scanning
          </Button>
        ) : (
          <Button
            onClick={onStopScan}
            variant="destructive"
            className="w-full bg-melon-red hover:bg-melon-darkRed"
          >
            <X className="mr-2 h-4 w-4" />
            Stop Scanning
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ScanControls;
