
export interface Network {
  id: string;
  ssid: string;
  bssid: string;
  channel: number;
  signal: number;
  encryption: "WPA3" | "WPA2" | "WPA" | "WEP" | "OPEN";
  vendor: string;
  clients: number;
  firstSeen: Date;
  lastSeen: Date;
}
