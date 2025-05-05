
import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import NetworkCard from "@/components/dashboard/NetworkCard";
import ScanControls from "@/components/dashboard/ScanControls";
import Terminal from "@/components/common/Terminal";
import DeauthAttack from "@/components/attacks/DeauthAttack";
import { toast } from "sonner";
import { Network } from "@/types/network";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { wifiService } from "@/services/wifiService";

const Index = () => {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [filteredNetworks, setFilteredNetworks] = useState<Network[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    // Check if backend is accessible
    const checkBackendStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/status");
        if (response.ok) {
          setIsBackendConnected(true);
          addLog("Backend connection established");
        } else {
          setIsBackendConnected(false);
          addLog("WARNING: Backend server not responding - using mock data");
        }
      } catch (error) {
        setIsBackendConnected(false);
        addLog("WARNING: Backend server not accessible - using mock data");
        console.error("Backend connection error:", error);
      }
    };
    
    checkBackendStatus();
  }, []);

  // Add log entry with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Start network scan
  const handleStartScan = async (interfaceName: string) => {
    setIsScanning(true);
    addLog(`Starting network scan on interface ${interfaceName}`);
    
    try {
      const result = await wifiService.scanNetworks(interfaceName);
      setNetworks(result.networks);
      setFilteredNetworks(result.networks);
      
      addLog(`Scan complete. Found ${result.networks.length} networks.`);
      toast.success(`Scan complete`, {
        description: `Found ${result.networks.length} networks`,
      });
    } catch (error) {
      console.error("Scan failed:", error);
      addLog(`Error during scan: ${error}`);
      toast.error("Network scan failed", {
        description: "Check console for details",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Stop network scan
  const handleStopScan = () => {
    setIsScanning(false);
    addLog("Scan stopped by user");
    toast.info("Network scan stopped", {
      description: `Found ${networks.length} networks`,
    });
  };

  // Filter networks based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredNetworks(networks);
    } else {
      const filtered = networks.filter(
        network =>
          (network.ssid || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          network.bssid.toLowerCase().includes(searchTerm.toLowerCase()) ||
          network.vendor.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNetworks(filtered);
    }
  }, [searchTerm, networks]);

  // Handle network selection
  const handleNetworkSelect = (network: Network) => {
    setSelectedNetwork(network);
    addLog(`Selected network: ${network.ssid || 'Hidden Network'} (${network.bssid})`);
    setShowAttackModal(true);
  };

  // Handle attack module close
  const handleAttackClose = () => {
    setShowAttackModal(false);
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">WiFi Reconnaissance</h1>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search networks..."
                className="pl-8 w-64 bg-cyber-gray border-cyber-gray"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isBackendConnected && (
          <div className="p-4 border border-yellow-600 bg-yellow-950/20 rounded-md mb-4 text-sm text-yellow-200">
            Backend connection not detected. Using mock data. 
            To use real scanning and attacks, please follow the setup instructions in the backend/README.md file.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ScanControls 
              onStartScan={handleStartScan}
              onStopScan={handleStopScan}
              isScanning={isScanning}
            />
          </div>
          
          <div className="lg:col-span-3">
            <Tabs defaultValue="networks" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="networks">Networks</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
              </TabsList>
              
              <TabsContent value="networks">
                {filteredNetworks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredNetworks.map((network) => (
                      <NetworkCard
                        key={network.id}
                        network={network}
                        onSelect={handleNetworkSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-cyber-gray rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-cyber-gray/20 flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Networks Found</h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                      {isScanning
                        ? "Scanning for networks..."
                        : "Start a network scan to discover WiFi access points in your area."}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="clients">
                <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-cyber-gray rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-cyber-gray/20 flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Client View</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    Select a network to view connected clients.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Terminal logs={logs} />

        {showAttackModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md">
              <DeauthAttack 
                targetNetwork={selectedNetwork} 
                onClose={handleAttackClose} 
              />
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default Index;
