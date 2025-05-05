
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WifiOff, X, AlertTriangle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Network } from "@/types/network";
import { toast } from "sonner";
import { wifiService } from "@/services/wifiService";

interface DeauthAttackProps {
  targetNetwork?: Network;
  onClose: () => void;
}

const DeauthAttack = ({ targetNetwork, onClose }: DeauthAttackProps) => {
  const [packets, setPackets] = useState<number>(50);
  const [allClients, setAllClients] = useState<boolean>(true);
  const [specificMac, setSpecificMac] = useState<string>("");
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  
  const handleStartAttack = async () => {
    if (!targetNetwork) return;
    
    setIsAttacking(true);
    setProgress(0);
    
    try {
      const clientMac = allClients ? null : specificMac;
      const response = await wifiService.deauthAttack(
        targetNetwork.bssid, 
        clientMac, 
        packets
      );
      
      // Simulate attack progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsAttacking(false);
            
            toast.success("Attack completed", {
              description: `Sent ${packets} deauth packets to ${targetNetwork.ssid || 'target network'}`
            });
            
            return 100;
          }
          return prev + 5;
        });
      }, 300);
      
    } catch (error) {
      console.error("Attack failed:", error);
      setIsAttacking(false);
      toast.error("Attack failed", {
        description: "Check console for details"
      });
    }
  };
  
  const handleStopAttack = () => {
    setIsAttacking(false);
    toast.info("Attack stopped", {
      description: "Deauthentication attack was stopped by user"
    });
  };

  if (!targetNetwork) return null;

  return (
    <Card className="border-cyber-gray bg-cyber-dark">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-5 w-5 text-red-500" />
            <CardTitle>Deauthentication Attack</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Disconnect clients from the target network</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 border border-yellow-600 bg-yellow-950/20 rounded-md flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-200">
            This module will send deauthentication packets to the target network, 
            disconnecting clients. Use responsibly and only on networks you have permission to test.
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium">Target Network</h3>
          <div className="p-3 bg-cyber-gray rounded-md">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">SSID:</span>
                <span className="text-sm">{targetNetwork.ssid || "Hidden Network"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">BSSID:</span>
                <span className="text-sm font-mono">{targetNetwork.bssid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Channel:</span>
                <span className="text-sm">{targetNetwork.channel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="packets">Deauth Packets</Label>
            <span className="text-sm">{packets}</span>
          </div>
          <Slider
            id="packets"
            disabled={isAttacking}
            min={10}
            max={100}
            step={5}
            value={[packets]}
            onValueChange={(value) => setPackets(value[0])}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="all-clients">Target All Clients</Label>
          <Switch
            id="all-clients"
            disabled={isAttacking}
            checked={allClients}
            onCheckedChange={setAllClients}
          />
        </div>

        {!allClients && (
          <div className="space-y-2">
            <Label htmlFor="specific-mac">Target MAC Address</Label>
            <Input
              id="specific-mac"
              disabled={isAttacking}
              placeholder="00:11:22:33:44:55"
              value={specificMac}
              onChange={(e) => setSpecificMac(e.target.value)}
            />
          </div>
        )}

        {isAttacking && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!isAttacking ? (
          <Button 
            className="w-full bg-red-600 hover:bg-red-700" 
            onClick={handleStartAttack}
          >
            <WifiOff className="mr-2 h-4 w-4" />
            Launch Attack
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className="w-full border-red-600 text-red-500" 
            onClick={handleStopAttack}
          >
            Stop Attack
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default DeauthAttack;
