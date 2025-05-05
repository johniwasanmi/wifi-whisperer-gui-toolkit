
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

// Mock data for networks
const mockNetworks: Network[] = [
  {
    id: "1",
    ssid: "HomeWiFi",
    bssid: "00:11:22:33:44:55",
    channel: 6,
    signal: 85,
    encryption: "WPA2",
    vendor: "Netgear",
    clients: 3,
    firstSeen: new Date(),
    lastSeen: new Date(),
  },
  {
    id: "2",
    ssid: "Office Network",
    bssid: "AA:BB:CC:DD:EE:FF",
    channel: 11,
    signal: 65,
    encryption: "WPA3",
    vendor: "Cisco",
    clients: 12,
    firstSeen: new Date(),
    lastSeen: new Date(),
  },
  {
    id: "3",
    ssid: "Guest WiFi",
    bssid: "11:22:33:44:55:66",
    channel: 1,
    signal: 35,
    encryption: "OPEN",
    vendor: "TP-Link",
    clients: 5,
    firstSeen: new Date(),
    lastSeen: new Date(),
  },
  {
    id: "4",
    ssid: "",
    bssid: "66:77:88:99:AA:BB",
    channel: 3,
    signal: 42,
    encryption: "WPA2",
    vendor: "Linksys",
    clients: 1,
    firstSeen: new Date(),
    lastSeen: new Date(),
  },
  {
    id: "5",
    ssid: "Secure Network",
    bssid: "CC:DD:EE:FF:00:11",
    channel: 2,
    signal: 78,
    encryption: "WEP",
    vendor: "D-Link",
    clients: 2,
    firstSeen: new Date(),
    lastSeen: new Date(),
  },
];

const Index = () => {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [filteredNetworks, setFilteredNetworks] = useState<Network[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAttackModal, setShowAttackModal] = useState(false);

  // Add log entry with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Start network scan
  const handleStartScan = (interfaceName: string) => {
    setIsScanning(true);
    setNetworks([]);
    setFilteredNetworks([]);
    addLog(`Starting network scan on interface ${interfaceName}`);
    
    // Simulate finding networks over time
    let discoveredCount = 0;
    const discoverInterval = setInterval(() => {
      if (discoveredCount < mockNetworks.length) {
        const newNetwork = mockNetworks[discoveredCount];
        addLog(`Found network: ${newNetwork.ssid || 'Hidden Network'} (${newNetwork.bssid})`);
        setNetworks(prev => [...prev, newNetwork]);
        setFilteredNetworks(prev => [...prev, newNetwork]);
        discoveredCount++;
      } else {
        clearInterval(discoverInterval);
        addLog(`Scan complete. Found ${mockNetworks.length} networks.`);
      }
    }, 1500);
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
          network.ssid.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
