# realtime/consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .encoding import process_frame  # Import your adjusted function

class VideoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        # If you receive frame data as base64 encoded string
        frame_data = json.loads(text_data)['image']
        encodings = await process_frame(frame_data)

        # You can now do something with the encodings, like save to DB

        # Send a response back to the client if necessary
        await self.send(text_data=json.dumps({
            'encodings': encodings
        }))

