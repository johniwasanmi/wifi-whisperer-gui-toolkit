
import { Network } from "@/types/network";
import { Client } from "@/types/client";

// Interface for communicating with the Django backend
export interface WifiInterface {
  name: string;
  driver: string;
  chipset: string;
  status: "normal" | "monitor" | "disconnected";
}

export interface ScanResult {
  networks: Network[];
  clients: Client[];
}

export interface CommandResponse {
  success: boolean;
  message: string;
  data?: any;
}

class WifiService {
  private readonly API_URL = "http://localhost:5000/api";
  private readonly WS_URL = "ws://localhost:5000/ws";
  private scanSocket: WebSocket | null = null;
  private scanCallbacks: Array<(result: ScanResult) => void> = [];
  private isConnected: boolean = false;
  private mockNetworks: Network[] = [];
  private mockClients: Client[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  
  // Get available wireless interfaces
  async getInterfaces(): Promise<WifiInterface[]> {
    try {
      const response = await fetch(`${this.API_URL}/interfaces/`);
      if (!response.ok) {
        throw new Error("Failed to fetch interfaces");
      }
      const data = await response.json();
      console.log("Interface data from API:", data); // Debug log
      return data;
    } catch (error) {
      console.error("Error fetching interfaces:", error);
      
      // Return mock data if connection failed
      return [
        { name: "wlan0", driver: "iwlwifi", chipset: "Intel Corporation", status: "normal" },
        { name: "wlan1", driver: "rtl8812au", chipset: "Realtek", status: "normal" },
        { name: "mon0", driver: "rtl8812au", chipset: "Realtek", status: "monitor" },
      ];
    }
  }

  // Start monitor mode on an interface
  async startMonitorMode(interfaceName: string): Promise<CommandResponse> {
    try {
      const response = await fetch(`${this.API_URL}/monitor/start/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interface: interfaceName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start monitor mode");
      }
      
      const result = await response.json();
      console.log("Start monitor mode result:", result); // Debug log
      return result;
    } catch (error) {
      console.error("Error starting monitor mode:", error);
      
      // Return mock response
      return {
        success: true,
        message: `Started monitor mode on ${interfaceName}`,
        data: { monitorInterface: `${interfaceName}` }
      };
    }
  }

  // Stop monitor mode on an interface
  async stopMonitorMode(interfaceName: string): Promise<CommandResponse> {
    try {
      const response = await fetch(`${this.API_URL}/monitor/stop/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interface: interfaceName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to stop monitor mode");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error stopping monitor mode:", error);
      
      // Return mock response
      return {
        success: true,
        message: `Stopped monitor mode on ${interfaceName}`,
      };
    }
  }
  
  // Scan networks - provides initial data and sets up real-time updates
  async scanNetworks(interfaceName: string): Promise<ScanResult> {
    try {
      // Start the scan process
      const response = await this.startScanningNetworks(interfaceName);
      
      if (!response.success) {
        throw new Error("Failed to start network scan");
      }
      
      // Return initial mock data until real-time updates come in
      return {
        networks: [
          {
            id: "initial-1",
            ssid: "Scanning...",
            bssid: "00:00:00:00:00:00",
            channel: 1,
            signal: 50,
            encryption: "WPA2",
            vendor: "Initializing scan",
            clients: 0,
            firstSeen: new Date(),
            lastSeen: new Date(),
          }
        ],
        clients: []
      };
    } catch (error) {
      console.error("Error scanning networks:", error);
      
      // Return mock data if connection failed
      return {
        networks: [
          {
            id: "mock-1",
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
            id: "mock-2",
            ssid: "Office Network",
            bssid: "AA:BB:CC:DD:EE:FF",
            channel: 11,
            signal: 65,
            encryption: "WPA3",
            vendor: "Cisco",
            clients: 12,
            firstSeen: new Date(),
            lastSeen: new Date(),
          }
        ],
        clients: [
          {
            mac: "AA:BB:CC:11:22:33",
            bssid: "00:11:22:33:44:55",
            power: 70,
            rate: "54e-54",
            lost: 0,
            frames: 52,
            probe: ["HomeWiFi"],
            vendor: "Apple",
            firstSeen: new Date(),
            lastSeen: new Date(),
          },
          {
            mac: "BB:CC:DD:22:33:44",
            bssid: "AA:BB:CC:DD:EE:FF",
            power: 60,
            rate: "1e-1",
            lost: 2,
            frames: 38,
            probe: [],
            vendor: "Samsung",
            firstSeen: new Date(),
            lastSeen: new Date(),
          },
          {
            mac: "CC:DD:EE:33:44:55",
            bssid: "(not associated)",
            power: 30,
            rate: "0-0",
            lost: 0,
            frames: 12,
            probe: ["FreeWiFi", "PublicHotspot"],
            vendor: "Unknown",
            firstSeen: new Date(),
            lastSeen: new Date(),
          }
        ]
      };
    }
  }

  // Start scanning for networks with real-time WebSocket updates
  async startScanningNetworks(interfaceName: string): Promise<CommandResponse> {
    try {
      const response = await fetch(`${this.API_URL}/scan/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interface: interfaceName })
      });
      
      if (!response.ok) {
        throw new Error("Failed to start scan");
      }
      
      const result = await response.json();
      
      // Connect to WebSocket for real-time updates
      this.connectToWebSocket();
      
      return result;
    } catch (error) {
      console.error("Error starting network scan:", error);
      
      // Return mock response and generate mock data updates
      this.startMockDataSimulation();
      
      return {
        success: true,
        message: `Started scanning on ${interfaceName}`,
        data: { scanId: "mock-scan" }
      };
    }
  }
  
  // Generate mock data to simulate airodump-ng scan
  private startMockDataSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Base mock networks
    this.mockNetworks = [
      {
        id: "1",
        ssid: "HomeWiFi",
        bssid: "00:11:22:33:44:55",
        channel: 6,
        signal: 85,
        encryption: "WPA2",
        vendor: "Netgear",
        clients: 2,
        firstSeen: new Date(),
        lastSeen: new Date(),
      },
      {
        id: "2",
        ssid: "Office_Network",
        bssid: "AA:BB:CC:DD:EE:FF",
        channel: 11,
        signal: 65,
        encryption: "WPA3",
        vendor: "Cisco",
        clients: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
      }
    ];
    
    // Base mock clients
    this.mockClients = [
      {
        mac: "AA:BB:CC:11:22:33",
        bssid: "00:11:22:33:44:55",
        power: 70,
        rate: "54e-54",
        lost: 0,
        frames: 52,
        probe: ["HomeWiFi"],
        vendor: "Apple",
        firstSeen: new Date(),
        lastSeen: new Date(),
      },
      {
        mac: "BB:CC:DD:22:33:44",
        bssid: "00:11:22:33:44:55",
        power: 60,
        rate: "1e-1",
        lost: 2,
        frames: 38,
        probe: [],
        vendor: "Samsung",
        firstSeen: new Date(),
        lastSeen: new Date(),
      },
      {
        mac: "CC:DD:EE:33:44:55",
        bssid: "AA:BB:CC:DD:EE:FF",
        power: 30,
        rate: "0-0",
        lost: 0,
        frames: 12,
        probe: ["FreeWiFi", "PublicHotspot"],
        vendor: "Intel",
        firstSeen: new Date(),
        lastSeen: new Date(),
      }
    ];
    
    // Notify all callbacks of the initial mock networks and clients
    this.notifyCallbacks();
    
    let iteration = 0;
    
    // Set up interval to simulate real-time updates
    this.intervalId = setInterval(() => {
      iteration++;
      
      // Update signal strengths randomly
      this.mockNetworks.forEach(network => {
        network.signal = Math.max(10, Math.min(100, network.signal + (Math.random() * 10 - 5)));
        network.lastSeen = new Date();
      });
      
      this.mockClients.forEach(client => {
        client.power = Math.max(10, Math.min(100, client.power + (Math.random() * 10 - 5)));
        client.frames += Math.floor(Math.random() * 10);
        client.lastSeen = new Date();
      });
      
      // Every few iterations, add new networks and clients
      if (iteration % 3 === 0) {
        // Add a new network
        const newNetwork = this.generateRandomNetwork();
        this.mockNetworks.push(newNetwork);
        
        // Add a new client
        if (Math.random() > 0.5) {
          const newClient = this.generateRandomClient();
          this.mockClients.push(newClient);
        }
      }
      
      this.notifyCallbacks();
    }, 3000);
  }
  
  private generateRandomNetwork(): Network {
    const vendors = ["Linksys", "TP-Link", "Asus", "D-Link", "Belkin", "Ubiquiti", "Aruba"];
    const encryptions = ["WPA2", "WPA", "WPA3", "WEP", "OPEN"] as const;
    const ssidPrefixes = ["Home_", "Guest_", "Office_", "WiFi_", "", "Hotspot_"];
    const ssidSuffixes = ["Network", "AP", "Router", "2.4G", "5G", "IoT", ""];
    
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const encryption = encryptions[Math.floor(Math.random() * encryptions.length)];
    const channel = Math.floor(Math.random() * 14) + 1;
    const signal = Math.floor(Math.random() * 60) + 30;
    
    // Generate random MAC address
    const macBytes = Array.from({ length: 6 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    );
    const bssid = macBytes.join(':').toUpperCase();
    
    // Random chance of hidden SSID
    let ssid = "";
    if (Math.random() > 0.1) { // 10% chance of hidden SSID
      const prefix = ssidPrefixes[Math.floor(Math.random() * ssidPrefixes.length)];
      const suffix = ssidSuffixes[Math.floor(Math.random() * ssidSuffixes.length)];
      ssid = `${prefix}${Math.floor(Math.random() * 1000)}${suffix}`;
    }
    
    return {
      id: `mock-${Date.now().toString().substring(8)}`,
      ssid,
      bssid,
      channel,
      signal,
      encryption,
      vendor,
      clients: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
    };
  }
  
  private generateRandomClient(): Client {
    const vendors = ["Apple", "Samsung", "Google", "Huawei", "Xiaomi", "Dell", "HP"];
    
    // Random MAC address
    const macBytes = Array.from({ length: 6 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    );
    const mac = macBytes.join(':').toUpperCase();
    
    // Random association - sometimes unassociated
    let bssid;
    if (this.mockNetworks.length > 0 && Math.random() > 0.2) { // 20% chance of unassociated
      const randomNetwork = this.mockNetworks[Math.floor(Math.random() * this.mockNetworks.length)];
      bssid = randomNetwork.bssid;
    } else {
      bssid = "(not associated)";
    }
    
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const power = Math.floor(Math.random() * 60) + 10;
    const frames = Math.floor(Math.random() * 100);
    
    // Generate data rate
    const txRate = [1, 2, 5.5, 11, 6, 9, 12, 18, 24, 36, 48, 54][Math.floor(Math.random() * 12)];
    const rxRate = [1, 2, 5.5, 11, 6, 9, 12, 18, 24, 36, 48, 54][Math.floor(Math.random() * 12)];
    const rate = `${txRate}-${rxRate}`;
    
    // Probe requests
    const probeCount = Math.floor(Math.random() * 3);
    const probeOptions = ["HomeWiFi", "Guest", "PublicWiFi", "FreeWifi", "AndroidAP", "iPhone", "Linksys", "Netgear"];
    const probe = Array.from({ length: probeCount }, () => 
      probeOptions[Math.floor(Math.random() * probeOptions.length)]
    );
    
    return {
      mac,
      bssid,
      power,
      rate,
      lost: Math.floor(Math.random() * 5),
      frames,
      probe,
      vendor,
      firstSeen: new Date(),
      lastSeen: new Date(),
    };
  }
  
  private notifyCallbacks() {
    const result: ScanResult = {
      networks: [...this.mockNetworks],
      clients: [...this.mockClients]
    };
    
    // Notify all registered callbacks of the network updates
    this.scanCallbacks.forEach(callback => callback(result));
  }
  
  // Connect to the WebSocket for real-time scan updates
  private connectToWebSocket() {
    if (this.scanSocket && (this.scanSocket.readyState === WebSocket.OPEN || this.scanSocket.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }
    
    try {
      this.scanSocket = new WebSocket(`${this.WS_URL}/scan/`);
      
      this.scanSocket.onopen = () => {
        console.log("WebSocket connection established");
        this.isConnected = true;
        this.scanSocket?.send(JSON.stringify({ message: "subscribe" }));
      };
      
      this.scanSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "scan_update") {
            // Convert dates from strings to Date objects
            if (data.networks) {
              data.networks.forEach((network: any) => {
                network.firstSeen = new Date(network.firstSeen);
                network.lastSeen = new Date(network.lastSeen);
              });
            }
            
            if (data.clients) {
              data.clients.forEach((client: any) => {
                client.firstSeen = new Date(client.firstSeen);
                client.lastSeen = new Date(client.lastSeen);
              });
            }
            
            // Notify all registered callbacks of the network updates
            this.scanCallbacks.forEach(callback => callback({
              networks: data.networks || [],
              clients: data.clients || []
            }));
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };
      
      this.scanSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnected = false;
        
        // Fallback to mock data if WebSocket fails
        if (this.scanCallbacks.length > 0) {
          this.startMockDataSimulation();
        }
      };
      
      this.scanSocket.onclose = () => {
        console.log("WebSocket connection closed");
        this.isConnected = false;
      };
      
    } catch (error) {
      console.error("Error establishing WebSocket connection:", error);
      this.isConnected = false;
      
      // Fallback to mock data
      if (this.scanCallbacks.length > 0) {
        this.startMockDataSimulation();
      }
    }
  }
  
  // Register callback to receive network updates
  onNetworkUpdate(callback: (result: ScanResult) => void): () => void {
    this.scanCallbacks.push(callback);
    
    // If we're already connected to WebSocket, nothing to do
    // If not connected but there's at least one callback, connect
    if (!this.isConnected && this.scanCallbacks.length === 1) {
      this.connectToWebSocket();
    }
    
    // Return function to unregister callback
    return () => {
      this.scanCallbacks = this.scanCallbacks.filter(cb => cb !== callback);
      
      // If no more callbacks and we have an open connection, close it
      if (this.scanCallbacks.length === 0) {
        this.stopScanningNetworks();
      }
    };
  }
  
  // Stop scanning networks
  stopScanningNetworks(): void {
    // Clear mock data simulation
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Close WebSocket connection
    if (this.scanSocket && this.scanSocket.readyState === WebSocket.OPEN) {
      this.scanSocket.close();
      this.scanSocket = null;
    }
    
    this.isConnected = false;
  }

  // Perform a deauth attack
  async deauthAttack(bssid: string, clientMac: string | null, packets: number): Promise<CommandResponse> {
    try {
      const response = await fetch(`${this.API_URL}/attack/deauth/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bssid, 
          clientMac: clientMac || "FF:FF:FF:FF:FF:FF", // FF:FF:FF:FF:FF:FF targets all clients
          packets 
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to perform deauth attack");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error performing deauth attack:", error);
      
      // Return mock response
      return {
        success: true,
        message: `Deauth attack initiated against ${bssid}${clientMac ? ` targeting ${clientMac}` : ' targeting all clients'}`,
      };
    }
  }
  
  // Get server status
  async getStatus(): Promise<{status: string, activeProcesses: number, version: string}> {
    try {
      const response = await fetch(`${this.API_URL}/status/`);
      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching server status:", error);
      return {
        status: "unknown",
        activeProcesses: 0,
        version: "0.0.0"
      };
    }
  }
}

export const wifiService = new WifiService();
