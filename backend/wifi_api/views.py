import json
import subprocess
import re
import threading
import time
import os
from datetime import datetime
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import (
    WifiInterfaceSerializer,
    MonitorModeSerializer,
    DeauthAttackSerializer,
    ScanResultSerializer,
    AirodumpOutputSerializer,
)

class WifiInterfacesView(APIView):
    def get(self, request):
        interfaces = []
        try:
            # First, get all wireless interfaces
            proc = subprocess.Popen(['iwconfig'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            out, err = proc.communicate()
            output = out.decode('utf-8')
            
            # Parse the output to find interfaces
            interface_sections = output.split('\n\n')
            for section in interface_sections:
                if not section.strip():
                    continue
                
                lines = section.strip().split('\n')
                if not lines:
                    continue
                
                # Get interface name from the first line
                interface_line = lines[0]
                interface_match = re.match(r'^(\w+)', interface_line)
                if not interface_match:
                    continue
                
                interface_name = interface_match.group(1)
                
                # Check if in monitor mode
                is_monitor = "Mode:Monitor" in section
                
                # Get driver and chipset information
                try:
                    driver_info = subprocess.check_output(
                        ['ethtool', '-i', interface_name], 
                        stderr=subprocess.STDOUT
                    ).decode('utf-8')
                    
                    driver_match = re.search(r'driver:\s*(\S+)', driver_info)
                    driver = driver_match.group(1) if driver_match else "Unknown"
                    
                    # Try to get chipset info from device
                    try:
                        pci_info = subprocess.check_output(
                            ['lspci', '-v'], 
                            stderr=subprocess.STDOUT
                        ).decode('utf-8')
                        
                        for line in pci_info.split('\n'):
                            if interface_name in line or driver in line:
                                chipset = line.strip()
                                break
                        else:
                            chipset = "Unknown"
                    except:
                        chipset = "Unknown"
                        
                except subprocess.CalledProcessError:
                    driver = "Unknown"
                    chipset = "Unknown"
                
                # Add interface to list
                interfaces.append({
                    'name': interface_name,
                    'driver': driver,
                    'chipset': chipset,
                    'status': "monitor" if is_monitor else "normal",
                    'phy': ""  # Optional field
                })
                
            return Response(interfaces)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MonitorModeStartView(APIView):
    def post(self, request):
        serializer = MonitorModeSerializer(data=request.data)
        if serializer.is_valid():
            interface = serializer.validated_data['interface']
            try:
                # First, bring the interface down
                subprocess.check_output(['sudo', 'ifconfig', interface, 'down'])
                
                # Set to monitor mode
                subprocess.check_output(['sudo', 'iwconfig', interface, 'mode', 'monitor'])
                
                # Bring the interface up again
                subprocess.check_output(['sudo', 'ifconfig', interface, 'up'])
                
                # Check if the mode was changed successfully
                iwconfig_output = subprocess.check_output(['iwconfig', interface]).decode('utf-8')
                
                if "Mode:Monitor" in iwconfig_output:
                    return Response({
                        "success": True,
                        "message": f"Interface {interface} is now in monitor mode",
                        "data": {
                            "monitorInterface": interface
                        }
                    })
                else:
                    return Response({
                        "success": False,
                        "message": f"Failed to set {interface} to monitor mode"
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except subprocess.CalledProcessError as e:
                error_output = e.output.decode('utf-8') if hasattr(e, 'output') else str(e)
                return Response({
                    "success": False,
                    "message": f"Error setting monitor mode: {error_output}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                return Response({
                    "success": False,
                    "message": f"Error: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MonitorModeStopView(APIView):
    def post(self, request):
        serializer = MonitorModeSerializer(data=request.data)
        if serializer.is_valid():
            interface = serializer.validated_data['interface']
            try:
                # First, bring the interface down
                subprocess.check_output(['sudo', 'ifconfig', interface, 'down'])
                
                # Set to managed mode
                subprocess.check_output(['sudo', 'iwconfig', interface, 'mode', 'managed'])
                
                # Bring the interface up again
                subprocess.check_output(['sudo', 'ifconfig', interface, 'up'])
                
                return Response({
                    "success": True,
                    "message": f"Interface {interface} is now in managed mode"
                })
            except subprocess.CalledProcessError as e:
                error_output = e.output.decode('utf-8') if hasattr(e, 'output') else str(e)
                return Response({
                    "success": False,
                    "message": f"Error setting managed mode: {error_output}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                return Response({
                    "success": False,
                    "message": f"Error: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ScanNetworksView(APIView):
    def post(self, request):
        serializer = MonitorModeSerializer(data=request.data)
        if serializer.is_valid():
            interface = serializer.validated_data['interface']
            
            # Check if interface is in monitor mode
            try:
                iwconfig_output = subprocess.check_output(['iwconfig', interface]).decode('utf-8')
                if "Mode:Monitor" not in iwconfig_output:
                    return Response({
                        "success": False,
                        "message": f"Interface {interface} is not in monitor mode"
                    }, status=status.HTTP_400_BAD_REQUEST)
            except subprocess.CalledProcessError:
                return Response({
                    "success": False,
                    "message": f"Failed to check interface {interface} mode"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Start airodump-ng in a separate thread
            try:
                # Create output directory if it doesn't exist
                output_dir = os.path.join(os.getcwd(), 'captures')
                os.makedirs(output_dir, exist_ok=True)
                
                # Generate timestamp for unique filename
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = os.path.join(output_dir, f"scan_{timestamp}")
                
                # Start airodump-ng process
                cmd = [
                    'sudo', 'airodump-ng',
                    '--write', output_file,
                    '--output-format', 'csv',
                    interface
                ]
                
                # Start process in background
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Store process ID for later termination
                from django.core.cache import cache
                cache.set('airodump_process_id', process.pid, timeout=None)
                cache.set('airodump_output_file', f"{output_file}-01.csv", timeout=None)
                
                # Start a thread to read and process the CSV file
                def process_csv():
                    time.sleep(2)  # Wait for airodump to create the file
                    
                    try:
                        while True:
                            # Check if process is still running
                            if process.poll() is not None:
                                break
                                
                            # Read and parse CSV file
                            csv_file = f"{output_file}-01.csv"
                            if os.path.exists(csv_file):
                                networks, clients = parse_airodump_csv(csv_file)
                                
                                # Send updates via WebSocket
                                channel_layer = get_channel_layer()
                                async_to_sync(channel_layer.group_send)(
                                    "scan_updates",
                                    {
                                        "type": "scan_update",
                                        "networks": networks,
                                        "clients": clients
                                    }
                                )
                            
                            time.sleep(1)  # Update interval
                    except Exception as e:
                        print(f"Error in CSV processing thread: {str(e)}")
                
                # Start the processing thread
                csv_thread = threading.Thread(target=process_csv)
                csv_thread.daemon = True
                csv_thread.start()
                
                return Response({
                    "success": True,
                    "message": f"Started scanning on {interface}",
                    "data": {
                        "scanId": timestamp,
                        "outputFile": f"{output_file}-01.csv"
                    }
                })
                
            except Exception as e:
                return Response({
                    "success": False,
                    "message": f"Error starting scan: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request):
        # Stop airodump-ng process
        from django.core.cache import cache
        process_id = cache.get('airodump_process_id')
        
        if process_id:
            try:
                # Kill the process
                subprocess.call(['sudo', 'kill', '-9', str(process_id)])
                cache.delete('airodump_process_id')
                return Response({
                    "success": True,
                    "message": "Scan stopped successfully"
                })
            except Exception as e:
                return Response({
                    "success": False,
                    "message": f"Error stopping scan: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({
                "success": False,
                "message": "No active scan to stop"
            }, status=status.HTTP_404_NOT_FOUND)

class DeauthAttackView(APIView):
    def post(self, request):
        serializer = DeauthAttackSerializer(data=request.data)
        if serializer.is_valid():
            bssid = serializer.validated_data['bssid']
            client_mac = serializer.validated_data.get('clientMac', 'FF:FF:FF:FF:FF:FF')
            packets = serializer.validated_data.get('packets', 10)
            
            # Get the first monitor mode interface
            try:
                proc = subprocess.Popen(['iwconfig'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                out, err = proc.communicate()
                output = out.decode('utf-8')
                
                monitor_interface = None
                interface_sections = output.split('\n\n')
                for section in interface_sections:
                    if "Mode:Monitor" in section:
                        interface_match = re.match(r'^(\w+)', section)
                        if interface_match:
                            monitor_interface = interface_match.group(1)
                            break
                
                if not monitor_interface:
                    return Response({
                        "success": False,
                        "message": "No monitor mode interface available"
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                # Execute deauth attack
                cmd = [
                    'sudo', 'aireplay-ng',
                    '--deauth', str(packets),
                    '-a', bssid
                ]
                
                # If specific client is targeted
                if client_mac and client_mac != 'FF:FF:FF:FF:FF:FF':
                    cmd.extend(['-c', client_mac])
                    
                cmd.append(monitor_interface)
                
                # Run the command
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Wait for completion with timeout
                try:
                    stdout, stderr = process.communicate(timeout=10)
                    if process.returncode == 0:
                        return Response({
                            "success": True,
                            "message": f"Deauth attack completed against {bssid}"
                        })
                    else:
                        return Response({
                            "success": False,
                            "message": f"Deauth attack failed: {stderr.decode('utf-8')}"
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                except subprocess.TimeoutExpired:
                    process.kill()
                    return Response({
                        "success": True,
                        "message": f"Deauth attack initiated against {bssid}"
                    })
                    
            except Exception as e:
                return Response({
                    "success": False,
                    "message": f"Error executing deauth attack: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StatusView(APIView):
    def get(self, request):
        try:
            # Check if airodump is running
            from django.core.cache import cache
            process_id = cache.get('airodump_process_id')
            
            active_processes = 0
            if process_id:
                try:
                    # Check if process exists
                    os.kill(int(process_id), 0)
                    active_processes = 1
                except OSError:
                    # Process doesn't exist
                    cache.delete('airodump_process_id')
            
            return Response({
                "status": "running",
                "activeProcesses": active_processes,
                "version": "1.0.0"
            })
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e),
                "version": "1.0.0"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AirodumpOutputView(APIView):
    def get(self, request):
        from django.core.cache import cache
        output_file = cache.get('airodump_output_file')
        
        if not output_file or not os.path.exists(output_file):
            return Response({
                "output": "No scan data available"
            })
        
        try:
            with open(output_file, 'r') as f:
                content = f.read()
                
            return Response({
                "output": content
            })
        except Exception as e:
            return Response({
                "output": f"Error reading scan data: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def parse_airodump_csv(csv_file):
    """Parse airodump-ng CSV output file and return networks and clients"""
    networks = []
    clients = []
    
    try:
        with open(csv_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # Split the file into networks and clients sections
        sections = content.split('\r\n\r\n')
        if len(sections) < 2:
            return networks, clients
            
        networks_section = sections[0]
        clients_section = sections[1]
        
        # Parse networks
        network_lines = networks_section.split('\r\n')
        if len(network_lines) > 1:
            headers = network_lines[0].split(',')
            
            for line in network_lines[1:]:
                if not line.strip():
                    continue
                    
                fields = line.split(',')
                if len(fields) < 14:
                    continue
                    
                # Extract network data
                bssid = fields[0].strip()
                first_seen = int(datetime.strptime(fields[1].strip(), '%Y-%m-%d %H:%M:%S').timestamp())
                last_seen = int(datetime.strptime(fields[2].strip(), '%Y-%m-%d %H:%M:%S').timestamp())
                channel = int(fields[3].strip()) if fields[3].strip().isdigit() else 0
                speed = fields[4].strip()
                privacy = fields[5].strip()
                cipher = fields[6].strip()
                authentication = fields[7].strip()
                power = int(fields[8].strip()) if fields[8].strip().lstrip('-').isdigit() else 0
                beacons = int(fields[9].strip()) if fields[9].strip().isdigit() else 0
                iv = int(fields[10].strip()) if fields[10].strip().isdigit() else 0
                lan_ip = fields[11].strip()
                id_length = int(fields[12].strip()) if fields[12].strip().isdigit() else 0
                essid = fields[13].strip()
                
                # Normalize signal strength (convert negative dBm to percentage)
                signal = min(100, max(0, int((100 + power) * 2))) if power < 0 else 0
                
                # Get vendor from MAC address (first 3 bytes)
                vendor = "Unknown"
                if bssid and len(bssid) >= 8:
                    oui = bssid.replace(':', '').upper()[:6]
                    # In a real implementation, you would look up the OUI in a database
                    # For now, we'll just use a placeholder
                    vendor = get_vendor_from_mac(bssid)
                
                networks.append({
                    'id': bssid.replace(':', ''),
                    'bssid': bssid,
                    'ssid': essid,
                    'channel': channel,
                    'signal': signal,
                    'encryption': privacy,
                    'vendor': vendor,
                    'clients': 0,  # Will be updated later
                    'firstSeen': first_seen,
                    'lastSeen': last_seen
                })
        
        # Parse clients
        client_lines = clients_section.split('\r\n')
        if len(client_lines) > 1:
            headers = client_lines[0].split(',')
            
            for line in client_lines[1:]:
                if not line.strip():
                    continue
                    
                fields = line.split(',')
                if len(fields) < 7:
                    continue
                    
                # Extract client data
                mac = fields[0].strip()
                first_seen = int(datetime.strptime(fields[1].strip(), '%Y-%m-%d %H:%M:%S').timestamp())
                last_seen = int(datetime.strptime(fields[2].strip(), '%Y-%m-%d %H:%M:%S').timestamp())
                power = int(fields[3].strip()) if fields[3].strip().lstrip('-').isdigit() else 0
                packets = int(fields[4].strip()) if fields[4].strip().isdigit() else 0
                bssid = fields[5].strip()
                probed_essids = fields[6].strip()
                
                # Normalize signal strength
                signal = min(100, max(0, int((100 + power) * 2))) if power < 0 else 0
                
                # Get vendor from MAC
                vendor = get_vendor_from_mac(mac)
                
                # Parse probed networks
                probes = [p.strip() for p in probed_essids.split(',') if p.strip()]
                
                clients.append({
                    'mac': mac,
                    'bssid': bssid,
                    'power': signal,
                    'rate': '0-0',  # Not provided by airodump CSV
                    'lost': 0,      # Not provided by airodump CSV
                    'frames': packets,
                    'probe': probes,
                    'vendor': vendor,
                    'firstSeen': first_seen,
                    'lastSeen': last_seen
                })
                
                # Update client count for the associated network
                if bssid != '(not associated)':
                    for network in networks:
                        if network['bssid'] == bssid:
                            network['clients'] += 1
                            break
        
        return networks, clients
    except Exception as e:
        print(f"Error parsing CSV: {str(e)}")
        return [], []

def get_vendor_from_mac(mac):
    """Get vendor name from MAC address"""
    # In a real implementation, you would use a MAC address database
    # For now, return some common vendors based on the first byte
    if not mac or len(mac) < 2:
        return "Unknown"
        
    first_byte = mac.split(':')[0].upper()
    
    vendors = {
        '00': 'Xerox',
        '08': 'Apple',
        '18': 'Cisco',
        '28': 'Netgear',
        '30': 'Dell',
        '40': 'Huawei',
        '44': 'Google',
        '50': 'Amazon',
        '60': 'Intel',
        '70': 'Samsung',
        '80': 'Sony',
        '90': 'Microsoft',
        'A0': 'Lenovo',
        'B0': 'HP',
        'C0': 'TP-Link',
        'D0': 'D-Link',
        'E0': 'Ubiquiti',
        'F0': 'Belkin'
    }
    
    return vendors.get(first_byte, "Unknown")
