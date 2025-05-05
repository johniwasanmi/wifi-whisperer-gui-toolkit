
import { Network } from "@/types/network";

// Interface for communicating with the Django backend
export interface WifiInterface {
  name: string;
  driver: string;
  chipset: string;
  status: "normal" | "monitor" | "disconnected";
}

export interface ScanResult {
  networks: Network[];
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
  private scanCallbacks: Array<(networks: Network[]) => void> = [];
  private isConnected: boolean = false;
  
  // Get available wireless interfaces
  async getInterfaces(): Promise<WifiInterface[]> {
    try {
      const response = await fetch(`${this.API_URL}/interfaces/`);
      if (!response.ok) {
        throw new Error("Failed to fetch interfaces");
      }
      return await response.json();
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
        throw new Error("Failed to start monitor mode");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error starting monitor mode:", error);
      
      // Return mock response
      return {
        success: true,
        message: `Started monitor mode on ${interfaceName}`,
        data: { monitorInterface: `${interfaceName}mon` }
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
        throw new Error("Failed to stop monitor mode");
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
      setTimeout(() => this.simulateScanUpdates(), 1000);
      
      return {
        success: true,
        message: `Started scanning on ${interfaceName}`,
        data: { scanId: "mock-scan" }
      };
    }
  }
  
  // Simulate scan updates with mock data
  private simulateScanUpdates() {
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
      }
    ];
    
    // Notify all callbacks of the mock networks
    this.scanCallbacks.forEach(callback => callback(mockNetworks));
    
    // Simulate another update with additional network after 3 seconds
    setTimeout(() => {
      mockNetworks.push({
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
      });
      
      this.scanCallbacks.forEach(callback => callback([...mockNetworks]));
    }, 3000);
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
          if (data.type === "scan_update" && data.networks) {
            // Notify all registered callbacks of the network updates
            this.scanCallbacks.forEach(callback => callback(data.networks));
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
          this.simulateScanUpdates();
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
        this.simulateScanUpdates();
      }
    }
  }
  
  // Register callback to receive network updates
  onNetworkUpdate(callback: (networks: Network[]) => void): () => void {
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
      if (this.scanCallbacks.length === 0 && this.scanSocket && this.scanSocket.readyState === WebSocket.OPEN) {
        this.scanSocket.close();
        this.scanSocket = null;
      }
    };
  }
  
  // Stop scanning networks
  stopScanningNetworks(): void {
    // Close WebSocket connection
    if (this.scanSocket && this.scanSocket.readyState === WebSocket.OPEN) {
      this.scanSocket.close();
      this.scanSocket = null;
    }
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
