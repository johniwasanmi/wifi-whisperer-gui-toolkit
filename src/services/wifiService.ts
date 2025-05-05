
import { Network } from "@/types/network";

// Interface for communicating with the Python backend
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

// This is a mock service that simulates the behavior of our Python backend
// In a real-world scenario, this would make actual API calls to our backend server
class WifiService {
  private readonly API_URL = "http://localhost:5000/api";
  
  // Get available wireless interfaces
  async getInterfaces(): Promise<WifiInterface[]> {
    try {
      const response = await fetch(`${this.API_URL}/interfaces`);
      if (!response.ok) {
        throw new Error("Failed to fetch interfaces");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching interfaces:", error);
      
      // Return mock data for now
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
      const response = await fetch(`${this.API_URL}/monitor/start`, {
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
      const response = await fetch(`${this.API_URL}/monitor/stop`, {
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

  // Scan for networks
  async scanNetworks(interfaceName: string): Promise<ScanResult> {
    try {
      const response = await fetch(`${this.API_URL}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interface: interfaceName })
      });
      
      if (!response.ok) {
        throw new Error("Failed to scan networks");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error scanning networks:", error);
      
      // Return mock data
      return {
        networks: [
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
          }
        ]
      };
    }
  }

  // Perform a deauth attack
  async deauthAttack(bssid: string, clientMac: string | null, packets: number): Promise<CommandResponse> {
    try {
      const response = await fetch(`${this.API_URL}/attack/deauth`, {
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
}

export const wifiService = new WifiService();
