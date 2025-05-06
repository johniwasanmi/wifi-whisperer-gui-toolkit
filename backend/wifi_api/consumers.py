
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
import subprocess
import re

class ScanConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Add the channel to the scan_updates group
        await self.channel_layer.group_add(
            "scan_updates",
            self.channel_name
        )
        await self.accept()
        
        # Send initial interface status on connection
        await self.send_interface_status()

    async def disconnect(self, close_code):
        # Remove the channel from the scan_updates group
        await self.channel_layer.group_discard(
            "scan_updates",
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message')
        
        if message == "subscribe":
            # Client is subscribing to updates
            await self.channel_layer.group_add(
                "scan_updates",
                self.channel_name
            )
            
            # Send current interface status when subscribed
            await self.send_interface_status()
        
        elif message == "get_interfaces":
            # Client is requesting interface status
            await self.send_interface_status()

    @sync_to_async
    def get_interface_status(self):
        interfaces = []
        try:
            # Get all wireless interfaces with their status
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
                
            return interfaces
        except Exception as e:
            print(f"Error getting interface status: {str(e)}")
            return []

    async def send_interface_status(self):
        interfaces = await self.get_interface_status()
        # Send interface status to the client
        await self.send(text_data=json.dumps({
            'type': 'interface_update',
            'interfaces': interfaces
        }))

    # Receive message from scan_updates group
    async def scan_update(self, event):
        networks = event['networks']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'scan_update',
            'networks': networks
        }))
        
    # Interface status update handler
    async def interface_update(self, event):
        interfaces = event['interfaces']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'interface_update',
            'interfaces': interfaces
        }))
