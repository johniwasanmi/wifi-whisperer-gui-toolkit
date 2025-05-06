
import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import NetworkCard from "@/components/dashboard/NetworkCard";
import ScanControls, { ScanOptions } from "@/components/dashboard/ScanControls";
import InterfaceList from "@/components/dashboard/InterfaceList";
import NetworkChart from "@/components/dashboard/NetworkChart";
import Terminal from "@/components/common/Terminal";
import DeauthAttack from "@/components/attacks/DeauthAttack";
import { toast } from "sonner";
import { Network } from "@/types/network";
import { Client } from "@/types/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { wifiService, WifiInterface } from "@/services/wifiService";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredNetworks, setFilteredNetworks] = useState<Network[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [selectedInterface, setSelectedInterface] = useState("");
  const [interfaces, setInterfaces] = useState<WifiInterface[]>([]);

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
    
    // Fetch interfaces initially
    fetchInterfaces();
  }, []);
  
  const fetchInterfaces = async () => {
    try {
      const data = await wifiService.getInterfaces();
      setInterfaces(data);
      
      // Auto-select monitor interfaces if available and none are selected
      if (!selectedInterface) {
        const monitorInterface = data.find(iface => iface.status === "monitor");
        if (monitorInterface) {
          setSelectedInterface(monitorInterface.name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch interfaces:", error);
    }
  };

  // Add log entry with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Start network scan
  const handleStartScan = async (options: ScanOptions) => {
    setIsScanning(true);
    addLog(`Starting network scan on interface ${options.interfaceName}, channel: ${options.channel || 'all'}`);
    
    let scanSubscription: (() => void) | null = null;
    
    try {
      // Start the scan process
      await wifiService.startScanningNetworks(options.interfaceName);
      
      // Subscribe to real-time scan updates
      scanSubscription = wifiService.onNetworkUpdate((result) => {
        if (result.networks) {
          setNetworks(result.networks);
          setFilteredNetworks(
            searchTerm.trim() === "" 
              ? result.networks
              : filterNetworks(result.networks, searchTerm)
          );
          
          // Log newly discovered networks
          const newNetworks = result.networks.filter(n => 
            !networks.some(existing => existing.bssid === n.bssid)
          );
          
          if (newNetworks.length > 0) {
            newNetworks.forEach(n => {
              addLog(`Discovered new AP: ${n.ssid || 'Hidden Network'} (${n.bssid}), Channel: ${n.channel}`);
            });
          }
        }
        
        if (result.clients) {
          setClients(result.clients);
          setFilteredClients(
            searchTerm.trim() === ""
              ? result.clients
              : filterClients(result.clients, searchTerm)
          );
          
          // Log newly discovered clients
          const newClients = result.clients.filter(c =>
            !clients.some(existing => existing.mac === c.mac)
          );
          
          if (newClients.length > 0) {
            newClients.forEach(c => {
              const apInfo = c.bssid !== '(not associated)' 
                ? `connected to ${c.bssid}` 
                : 'not associated';
              addLog(`Discovered new client: ${c.mac} (${apInfo})`);
            });
          }
        }
      });
      
      toast.success(`Scan started on ${options.interfaceName}`, {
        description: `Monitoring on channel ${options.channel || 'all'}`,
      });
      
    } catch (error) {
      console.error("Scan failed:", error);
      addLog(`Error starting scan: ${error}`);
      toast.error("Network scan failed", {
        description: "Check console for details",
      });
      setIsScanning(false);
    }
    
    // Return a cleanup function
    return () => {
      if (scanSubscription) {
        scanSubscription();
      }
    };
  };

  // Stop network scan
  const handleStopScan = () => {
    wifiService.stopScanningNetworks();
    setIsScanning(false);
    addLog("Scan stopped by user");
    toast.info("Network scan stopped", {
      description: `Found ${networks.length} networks`,
    });
  };
  
  const filterNetworks = (networks: Network[], term: string) => {
    return networks.filter(
      network =>
        (network.ssid || "").toLowerCase().includes(term.toLowerCase()) ||
        network.bssid.toLowerCase().includes(term.toLowerCase()) ||
        network.vendor.toLowerCase().includes(term.toLowerCase())
    );
  };
  
  const filterClients = (clients: Client[], term: string) => {
    return clients.filter(
      client =>
        client.mac.toLowerCase().includes(term.toLowerCase()) ||
        client.bssid.toLowerCase().includes(term.toLowerCase()) ||
        (client.vendor || "").toLowerCase().includes(term.toLowerCase())
    );
  };

  // Filter networks and clients based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredNetworks(networks);
      setFilteredClients(clients);
    } else {
      setFilteredNetworks(filterNetworks(networks, searchTerm));
      setFilteredClients(filterClients(clients, searchTerm));
    }
  }, [searchTerm, networks, clients]);

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
  
  // Get clients for a specific network
  const getClientsForNetwork = (bssid: string) => {
    return clients.filter(client => client.bssid === bssid);
  };
  
  // Check if selected interface is in monitor mode
  const isSelectedInterfaceMonitor = () => {
    const selectedInterfaceObj = interfaces.find(i => i.name === selectedInterface);
    return selectedInterfaceObj?.status === "monitor";
  };

  return (
    <SidebarLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-melon-green">WiFi Reconnaissance</h1>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search networks..."
                className="pl-8 w-64 bg-melon-darkGreen/5 border-melon-green/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchInterfaces}>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 flex flex-col gap-4">
            <InterfaceList 
              onInterfaceSelect={setSelectedInterface}
              selectedInterface={selectedInterface}
              isScanning={isScanning}
            />
            
            <ScanControls 
              onStartScan={handleStartScan}
              onStopScan={handleStopScan}
              isScanning={isScanning}
              selectedInterface={selectedInterface}
              interfaceInMonitorMode={isSelectedInterfaceMonitor()}
            />
          </div>
          
          <div className="lg:col-span-9">
            <Tabs defaultValue="networks" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="networks">Networks</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
                <TabsTrigger value="topology">Network Map</TabsTrigger>
              </TabsList>
              
              <TabsContent value="networks">
                {filteredNetworks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredNetworks.map((network) => (
                      <NetworkCard
                        key={network.bssid}
                        network={{
                          ...network,
                          clients: getClientsForNetwork(network.bssid).length
                        }}
                        onSelect={handleNetworkSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-melon-green/30 rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-melon-green/10 flex items-center justify-center mb-4">
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
                {filteredClients.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredClients.map((client) => (
                      <Card key={client.mac} className="hover:border-melon-green transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{client.vendor || "Unknown Device"}</h3>
                              <div className="font-mono text-xs text-muted-foreground">{client.mac}</div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs">Signal: {client.power}</span>
                              <span className="text-xs text-muted-foreground">Rate: {client.rate}</span>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Connected to: </span>
                              <span className={client.bssid === '(not associated)' ? 'text-yellow-500' : 'text-melon-green'}>
                                {client.bssid}
                              </span>
                            </div>
                            {client.probe && client.probe.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                <span>Probing: </span>
                                {client.probe.join(", ")}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-melon-green/30 rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-melon-green/10 flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Clients Found</h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                      {isScanning
                        ? "Scanning for clients..."
                        : "Start a network scan to discover connected clients."}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="topology">
                <NetworkChart 
                  networks={filteredNetworks} 
                  clients={filteredClients}
                  isLoading={isScanning && networks.length === 0}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Terminal logs={logs} />

        {showAttackModal && selectedNetwork && (
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
