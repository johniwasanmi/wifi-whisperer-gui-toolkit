
export interface Client {
  mac: string;          // MAC address of the client
  bssid: string;        // BSSID of the AP the client is connected to (or '(not associated)')
  power: number;        // Signal strength
  rate: string;         // Data rate
  lost: number;         // Lost packets
  frames: number;       // Number of frames
  probe: string[];      // Probe requests
  vendor?: string;      // Client vendor information
  firstSeen: Date;
  lastSeen: Date;
}
