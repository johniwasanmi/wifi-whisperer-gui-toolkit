
import re
import time
import json
import logging
import os
import signal
import subprocess
import threading
import uuid
from typing import Dict, List, Optional, Any, Tuple

from django.http import JsonResponse
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    WifiInterfaceSerializer, 
    ScanResultSerializer, 
    MonitorModeSerializer,
    DeauthAttackSerializer
)

logger = logging.getLogger(__name__)
active_processes: Dict[str, subprocess.Popen] = {}
scan_results: Dict[str, Any] = {}

class WifiInterfacesView(APIView):
    """Get available wireless interfaces using airmon-ng"""
    
    def get(self, request):
        # Use airmon-ng instead of iwconfig to get more detailed interface info
        success, stdout, stderr = self.run_command(['airmon-ng'])
        if not success:
            # Fallback to iwconfig if airmon-ng fails
            logger.warning("airmon-ng failed, falling back to iwconfig")
            return self.fallback_iwconfig()
        
        interfaces = []
        
        # Parse airmon-ng output
        # Format: PHY Interface Driver Chipset
        lines = stdout.strip().split('\n')
        
        # Skip header lines
        for line in lines:
            if "PHY" in line and "Interface" in line and "Driver" in line and "Chipset" in line:
                continue
            
            # Skip empty lines
            if not line.strip():
                continue
            
            # Parse line
            parts = line.split('\t')
            if len(parts) >= 4:
                phy = parts[0].strip()
                interface = parts[1].strip()
                driver = parts[2].strip()
                chipset = ' '.join(part.strip() for part in parts[3:]).strip()
                
                # Skip if no interface name
                if not interface:
                    continue
                
                # Determine if interface is in monitor mode
                mode = "monitor" if "mon" in interface else "normal"
                
                interfaces.append({
                    "name": interface,
                    "driver": driver,
                    "chipset": chipset,
                    "status": mode,
                    "phy": phy
                })
        
        # If no interfaces found, add mock interfaces for testing
        if not interfaces:
            interfaces = [
                {"name": "wlan0", "driver": "iwlwifi", "chipset": "Intel", "status": "normal", "phy": "phy0"},
                {"name": "wlan1", "driver": "rtl8812au", "chipset": "Realtek", "status": "normal", "phy": "phy1"}
            ]
        
        serializer = WifiInterfaceSerializer(interfaces, many=True)
        return Response(serializer.data)
    
    def fallback_iwconfig(self):
        """Fallback to using iwconfig if airmon-ng is not available"""
        success, stdout, stderr = self.run_command(['iwconfig'])
        if not success:
            return Response({"error": stderr}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        interfaces = []
        current_interface = None
        
        for line in stdout.split('\n'):
            if line and not line.startswith(' '):
                # New interface found
                interface_match = re.match(r'^(\w+)', line)
                if interface_match:
                    current_interface = interface_match.group(1)
                    
                    # Check if it's a wireless interface
                    if 'no wireless extensions' not in line:
                        # Get additional info
                        success, driver_info, _ = self.run_command(['ethtool', '-i', current_interface])
                        driver = "unknown"
                        chipset = "unknown"
                        
                        if success:
                            driver_match = re.search(r'driver:\s+(\w+)', driver_info)
                            if driver_match:
                                driver = driver_match.group(1)
                        
                        # Determine if interface is in monitor mode
                        mode = "normal"
                        if "Mode:Monitor" in line:
                            mode = "monitor"
                        
                        interfaces.append({
                            "name": current_interface,
                            "driver": driver,
                            "chipset": chipset,
                            "status": mode,
                            "phy": "unknown"
                        })
        
        # If no interfaces found, add mock interfaces for testing
        if not interfaces:
            interfaces = [
                {"name": "wlan0", "driver": "iwlwifi", "chipset": "Intel", "status": "normal", "phy": "phy0"},
                {"name": "wlan1", "driver": "rtl8812au", "chipset": "Realtek", "status": "normal", "phy": "phy1"}
            ]
        
        serializer = WifiInterfaceSerializer(interfaces, many=True)
        return Response(serializer.data)

    def run_command(self, command: List[str]) -> Tuple[bool, str, Optional[str]]:
        """Run a shell command and return its output."""
        try:
            logger.info(f"Running command: {' '.join(command)}")
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            return True, result.stdout, None
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed with exit code {e.returncode}: {e.stderr}")
            return False, "", e.stderr
        except Exception as e:
            logger.error(f"Error executing command: {str(e)}")
            return False, "", str(e)

class MonitorModeStartView(APIView):
    """Start monitor mode on a wireless interface"""
    
    def post(self, request):
        serializer = MonitorModeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        interface = serializer.validated_data['interface']
        
        # Kill potentially interfering processes
        self.run_command(['airmon-ng', 'check', 'kill'])
        
        # Start monitor mode
        success, stdout, stderr = self.run_command(['airmon-ng', 'start', interface])
        
        if not success:
            return Response({"error": stderr}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Parse the output to get the monitor interface name
        monitor_interface = f"{interface}mon"  # Default naming convention
        match = re.search(r'(monitor mode enabled on|monitor mode vif enabled for) (\w+)', stdout)
        if match:
            monitor_interface = match.group(2)
        
        # Broadcast interface update via WebSocket
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "interface_updates",
                {
                    'type': 'interface_update',
                    'message': 'Interface status changed'
                }
            )
        except Exception as e:
            logger.error(f"Error broadcasting interface update: {str(e)}")
        
        return Response({
            "success": True,
            "message": f"Started monitor mode on {interface}",
            "data": {
                "monitorInterface": monitor_interface
            }
        })

    def run_command(self, command: List[str]) -> Tuple[bool, str, Optional[str]]:
        """Run a shell command and return its output."""
        try:
            logger.info(f"Running command: {' '.join(command)}")
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            return True, result.stdout, None
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed with exit code {e.returncode}: {e.stderr}")
            return False, "", e.stderr
        except Exception as e:
            logger.error(f"Error executing command: {str(e)}")
            return False, "", str(e)

class MonitorModeStopView(APIView):
    """Stop monitor mode on a wireless interface"""
    
    def post(self, request):
        serializer = MonitorModeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        interface = serializer.validated_data['interface']
        
        success, stdout, stderr = self.run_command(['airmon-ng', 'stop', interface])
        
        if not success:
            return Response({"error": stderr}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Broadcast interface update via WebSocket
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "interface_updates",
                {
                    'type': 'interface_update',
                    'message': 'Interface status changed'
                }
            )
        except Exception as e:
            logger.error(f"Error broadcasting interface update: {str(e)}")
        
        return Response({
            "success": True,
            "message": f"Stopped monitor mode on {interface}"
        })

    def run_command(self, command: List[str]) -> Tuple[bool, str, Optional[str]]:
        """Run a shell command and return its output."""
        try:
            logger.info(f"Running command: {' '.join(command)}")
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            return True, result.stdout, None
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed with exit code {e.returncode}: {e.stderr}")
            return False, "", e.stderr
        except Exception as e:
            logger.error(f"Error executing command: {str(e)}")
            return False, "", str(e)

class ScanNetworksView(APIView):
    """Scan for wireless networks using airodump-ng"""
    
    def post(self, request):
        serializer = MonitorModeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        interface = serializer.validated_data['interface']
        
        # Check if interface is in monitor mode
        success, stdout, stderr = self.run_command(['iwconfig', interface])
        if not success or "Mode:Monitor" not in stdout:
            return Response({
                "error": "Interface is not in monitor mode", 
                "details": stderr or "Run airmon-ng start on the interface first"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate a unique ID for this scan
        scan_id = str(uuid.uuid4())
        output_file = f"/tmp/scan_{scan_id}"
        
        # Start airodump-ng in a background process and broadcast updates via WebSockets
        self.start_scan_process(scan_id, interface, output_file)
        
        return Response({
            "success": True,
            "message": f"Scan started on {interface}",
            "scan_id": scan_id
        })

    def start_scan_process(self, scan_id: str, interface: str, output_file: str):
        """Start the scan process in a background thread and broadcast updates via WebSockets"""
        def scan_thread():
            cmd = ['airodump-ng', '--output-format', 'csv', '--write', output_file, interface]
            
            try:
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                active_processes[scan_id] = process
                
                # Check for results every 2 seconds
                while scan_id in active_processes:
                    # Parse the CSV file if it exists
                    networks, clients = self.parse_csv_results(f"{output_file}-01.csv")
                    
                    # Broadcast results via WebSocket
                    if networks or clients:
                        channel_layer = get_channel_layer()
                        async_to_sync(channel_layer.group_send)(
                            "scan_updates",
                            {
                                'type': 'scan_update',
                                'networks': networks,
                                'clients': clients
                            }
                        )
                    
                    time.sleep(2)
                    
                # Clean up process
                if not process.poll():
                    process.terminate()
                    process.wait(timeout=5)
                
                # Clean up the temporary files
                for ext in ['-01.csv', '-01.kismet.csv', '-01.kismet.netxml', '-01.cap']:
                    file_path = f"{output_file}{ext}"
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        
            except Exception as e:
                logger.error(f"Error in scan thread: {str(e)}")
                if scan_id in active_processes:
                    del active_processes[scan_id]
        
        # Start the thread
        thread = threading.Thread(target=scan_thread)
        thread.daemon = True
        thread.start()
    
    def parse_csv_results(self, csv_file: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Parse the airodump-ng CSV output file to extract network and client information"""
        networks = []
        clients = []
        
        if not os.path.exists(csv_file):
            return networks, clients
            
        try:
            with open(csv_file, 'r') as f:
                lines = f.readlines()
            
            # Parse networks section
            network_section = True
            current_line = 0
            
            while current_line < len(lines):
                line = lines[current_line].strip()
                current_line += 1
                
                if line == "":
                    network_section = False
                    # Skip the client header line
                    current_line += 1
                    break
                
                if network_section and "BSSID" not in line and line:
                    # Parse network info
                    parts = line.split(',')
                    if len(parts) >= 14:
                        bssid = parts[0].strip()
                        first_seen = parts[1].strip()
                        last_seen = parts[2].strip()
                        channel = parts[5].strip()
                        speed = parts[6].strip()
                        privacy = parts[7].strip()
                        power = parts[8].strip()
                        beacons = parts[9].strip()
                        iv_packets = parts[10].strip()
                        lan_ip = parts[11].strip()
                        id_length = parts[12].strip()
                        essid = parts[13].strip()
                        
                        try:
                            signal = abs(int(power))
                        except ValueError:
                            signal = 0
                            
                        try:
                            channel_num = int(channel)
                        except ValueError:
                            channel_num = 0
                        
                        # Determine encryption type from privacy field
                        encryption = "OPEN"
                        if "WPA3" in privacy:
                            encryption = "WPA3"
                        elif "WPA2" in privacy:
                            encryption = "WPA2"
                        elif "WPA" in privacy:
                            encryption = "WPA"
                        elif "WEP" in privacy:
                            encryption = "WEP"
                            
                        # Create network object
                        network = {
                            "id": str(len(networks) + 1),
                            "ssid": essid if essid != "" else "",
                            "bssid": bssid,
                            "channel": channel_num,
                            "signal": min(signal, 100),  # Cap at 100
                            "encryption": encryption,
                            "vendor": bssid[:8].upper(),  # Would need a proper OUI database
                            "clients": 0,  # Will be updated after parsing clients
                            "firstSeen": int(time.mktime(time.strptime(first_seen, "%Y-%m-%d %H:%M:%S")) * 1000),
                            "lastSeen": int(time.mktime(time.strptime(last_seen, "%Y-%m-%d %H:%M:%S")) * 1000)
                        }
                        networks.append(network)
            
            # Parse clients section - starts after the first empty line
            while current_line < len(lines):
                line = lines[current_line].strip()
                current_line += 1
                
                if "Station MAC" not in line and line:
                    # Parse client info
                    parts = line.split(',')
                    if len(parts) >= 6:
                        mac = parts[0].strip()
                        first_seen = parts[1].strip()
                        last_seen = parts[2].strip()
                        power = parts[3].strip()
                        packets = parts[4].strip()
                        bssid = parts[5].strip()
                        
                        # Parse probe requests
                        probe = []
                        if len(parts) > 6:
                            probes = ','.join(parts[6:]).strip()
                            if probes:
                                probe = [p.strip() for p in probes.split(',')]
                        
                        try:
                            signal_power = abs(int(power))
                        except ValueError:
                            signal_power = 0
                        
                        try:
                            packet_count = int(packets)
                        except ValueError:
                            packet_count = 0
                        
                        # Create client object
                        client = {
                            "mac": mac,
                            "bssid": bssid,
                            "power": min(signal_power, 100),  # Cap at 100
                            "rate": "0-0",  # Not available in CSV, would need to parse real-time
                            "lost": 0,  # Not available in CSV, would need to parse real-time
                            "frames": packet_count,
                            "probe": probe,
                            "vendor": mac[:8].upper(),  # Would need a proper OUI database
                            "firstSeen": int(time.mktime(time.strptime(first_seen, "%Y-%m-%d %H:%M:%S")) * 1000),
                            "lastSeen": int(time.mktime(time.strptime(last_seen, "%Y-%m-%d %H:%M:%S")) * 1000)
                        }
                        clients.append(client)
                        
                        # Update client count for the associated AP
                        if bssid != "(not associated)":
                            for network in networks:
                                if network["bssid"] == bssid:
                                    network["clients"] += 1
                                    break
            
        except Exception as e:
            logger.error(f"Error parsing CSV file: {str(e)}")
        
        return networks, clients
    
    def run_command(self, command: List[str]) -> Tuple[bool, str, Optional[str]]:
        """Run a shell command and return its output."""
        try:
            logger.info(f"Running command: {' '.join(command)}")
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            return True, result.stdout, None
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed with exit code {e.returncode}: {e.stderr}")
            return False, "", e.stderr
        except Exception as e:
            logger.error(f"Error executing command: {str(e)}")
            return False, "", str(e)

class DeauthAttackView(APIView):
    """Perform a deauthentication attack using aireplay-ng"""
    
    def post(self, request):
        serializer = DeauthAttackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        bssid = serializer.validated_data['bssid']
        client_mac = serializer.validated_data.get('clientMac', 'FF:FF:FF:FF:FF:FF')
        packets = serializer.validated_data.get('packets', 10)
        
        # Get the first monitor mode interface
        success, stdout, stderr = self.run_command(['iwconfig'])
        monitor_interface = None
        
        if success:
            for line in stdout.split('\n'):
                if 'Mode:Monitor' in line:
                    monitor_match = re.match(r'^(\w+)', line)
                    if monitor_match:
                        monitor_interface = monitor_match.group(1)
                        break
        
        if not monitor_interface:
            return Response({"error": "No monitor mode interface found"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Run the deauth attack
        attack_id = str(uuid.uuid4())
        self.run_deauth_attack(attack_id, monitor_interface, bssid, client_mac, packets)
        
        return Response({
            "success": True,
            "message": f"Deauthentication attack started",
            "data": {"attackId": attack_id}
        })

    def run_command(self, command: List[str]) -> Tuple[bool, str, Optional[str]]:
        """Run a shell command and return its output."""
        try:
            logger.info(f"Running command: {' '.join(command)}")
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            return True, result.stdout, None
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed with exit code {e.returncode}: {e.stderr}")
            return False, "", e.stderr
        except Exception as e:
            logger.error(f"Error executing command: {str(e)}")
            return False, "", str(e)

    def run_deauth_attack(self, attack_id: str, interface: str, bssid: str, client_mac: str, packets: int):
        """Run deauth attack in a separate thread"""
        def attack_thread():
            cmd = ['aireplay-ng', '--deauth', str(packets), '-a', bssid]
            
            # If targeting a specific client
            if client_mac and client_mac != 'FF:FF:FF:FF:FF:FF':
                cmd.extend(['-c', client_mac])
                
            cmd.append(interface)
            
            try:
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                active_processes[attack_id] = process
                
                # Wait for the process to complete
                stdout, stderr = process.communicate()
                
                if process.returncode != 0:
                    logger.error(f"Deauth attack failed: {stderr.decode('utf-8')}")
                else:
                    logger.info(f"Deauth attack completed successfully")
                    
                # Clean up
                if attack_id in active_processes:
                    del active_processes[attack_id]
                    
            except Exception as e:
                logger.error(f"Error during deauth attack: {str(e)}")
                if attack_id in active_processes:
                    del active_processes[attack_id]
        
        # Start the thread
        thread = threading.Thread(target=attack_thread)
        thread.daemon = True
        thread.start()

class AirodumpOutputView(APIView):
    """Parse airodump-ng output directly from terminal output"""
    
    def post(self, request):
        if not request.data.get('output'):
            return Response({"error": "Output data is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        output = request.data.get('output')
        
        # Parse the output into networks and clients
        networks, clients = self.parse_airodump_output(output)
        
        return Response({
            "success": True,
            "networks": networks,
            "clients": clients
        })
    
    def parse_airodump_output(self, output: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Parse airodump-ng terminal output into network and client lists"""
        networks = []
        clients = []
        
        lines = output.strip().split('\n')
        network_section = False
        client_section = False
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
                
            # Check for section headers
            if "BSSID              PWR" in line:
                network_section = True
                client_section = False
                continue
                
            if "BSSID              STATION" in line:
                network_section = False
                client_section = True
                continue
                
            # Parse network line
            if network_section and not line.startswith("BSSID"):
                try:
                    # Example: 00:14:6C:7A:41:81   34 100       57       14    1   9  11e  WEP  WEP         bigbear 
                    parts = line.split()
                    if len(parts) >= 11:
                        bssid = parts[0]
                        signal = abs(int(parts[1])) if parts[1] != "-1" else 0
                        beacons = int(parts[3]) if parts[3].isdigit() else 0
                        data = int(parts[4]) if parts[4].isdigit() else 0
                        channel = int(parts[6]) if parts[6].isdigit() else 0
                        
                        # Extract encryption and cipher
                        enc_idx = 8
                        cipher_idx = 9
                        auth_idx = 10
                        ssid_idx = 11
                        
                        # Check if MB has an 'e' suffix indicating QoS
                        if 'e' in parts[7]:
                            enc_idx = 8
                            cipher_idx = 9
                            auth_idx = 10
                            ssid_idx = 11
                        
                        encryption = parts[enc_idx] if len(parts) > enc_idx else "OPN"
                        
                        # Get ESSID - it might contain spaces, so join the remaining parts
                        ssid = ' '.join(parts[ssid_idx:]) if len(parts) > ssid_idx else ""
                        
                        # Map encryption values
                        if encryption == "WPA3":
                            enc_type = "WPA3"
                        elif encryption == "WPA2":
                            enc_type = "WPA2"
                        elif encryption == "WPA":
                            enc_type = "WPA"
                        elif encryption == "WEP":
                            enc_type = "WEP"
                        else:
                            enc_type = "OPEN"
                            
                        # Create network object
                        network = {
                            "id": str(len(networks) + 1),
                            "ssid": ssid,
                            "bssid": bssid,
                            "channel": channel,
                            "signal": min(signal, 100),  # Cap at 100
                            "encryption": enc_type,
                            "vendor": bssid[:8].upper(),  # Would need a proper OUI database
                            "clients": 0,
                            "firstSeen": int(time.time() * 1000),
                            "lastSeen": int(time.time() * 1000)
                        }
                        networks.append(network)
                except Exception as e:
                    logger.error(f"Error parsing network line: {line}, Error: {str(e)}")
                    
            # Parse client line
            if client_section and not line.startswith("BSSID"):
                try:
                    # Example: 00:14:6C:7A:41:81  00:0F:B5:32:31:31   51   36-24    2       14           
                    parts = line.split()
                    if len(parts) >= 6:
                        bssid = parts[0]
                        mac = parts[1]
                        power = abs(int(parts[2])) if parts[2] != "-1" else 0
                        rate = parts[3]
                        lost = int(parts[4]) if parts[4].isdigit() else 0
                        frames = int(parts[5]) if parts[5].isdigit() else 0
                        
                        # Check for probes
                        probe_idx = 7  # Typical index after "Notes" column
                        probes = []
                        
                        if len(parts) > probe_idx:
                            probes = ' '.join(parts[probe_idx:]).split(',')
                            probes = [p.strip() for p in probes]
                        
                        # Create client object
                        client = {
                            "mac": mac,
                            "bssid": bssid,
                            "power": min(power, 100),  # Cap at 100
                            "rate": rate,
                            "lost": lost,
                            "frames": frames,
                            "probe": probes,
                            "vendor": mac[:8].upper(),  # Would need a proper OUI database
                            "firstSeen": int(time.time() * 1000),
                            "lastSeen": int(time.time() * 1000)
                        }
                        clients.append(client)
                        
                        # Update client count for the associated AP
                        if bssid != "(not associated)":
                            for network in networks:
                                if network["bssid"] == bssid:
                                    network["clients"] += 1
                                    break
                except Exception as e:
                    logger.error(f"Error parsing client line: {line}, Error: {str(e)}")
        
        return networks, clients

class StatusView(APIView):
    """Get the status of the backend server"""
    
    def get(self, request):
        return Response({
            "status": "running",
            "activeProcesses": len(active_processes),
            "version": "0.2.0"
        })
