
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ScanConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Add the channel to the scan_updates group
        await self.channel_layer.group_add(
            "scan_updates",
            self.channel_name
        )
        await self.accept()

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

    # Receive message from scan_updates group
    async def scan_update(self, event):
        networks = event['networks']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'scan_update',
            'networks': networks
        }))
