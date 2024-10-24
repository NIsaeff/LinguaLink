import logging
# from cartesia import AsyncCartesia
from dotenv import load_dotenv
import os
# import asyncio
import websockets
import json
import uuid
import base64

load_dotenv()

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import re

def validate_and_format_text(text: str) -> str:
    # Remove any unsupported characters (leaving only alphanumeric, hyphens, and underscores)
    valid_text = re.sub(r'[^a-zA-Z0-9_\- ]', '', text)
    return valid_text

async def process_audio_in_segments(text: str, segment_size: int = 9):
    try:
        # Validate and format text
        text = validate_and_format_text(text)
        logger.debug(f"Validated text: {text}")

        # Split text into segments of 'segment_size' words each
        words = text.split()
        segments = [' '.join(words[i:i + segment_size]) for i in range(0, len(words), segment_size)]
        
        # WebSocket URL and headers
        ws_url = 'wss://api.cartesia.ai/tts/websocket'
        api_key = os.getenv("CARTESIA_API_KEY")
        cartesia_version = os.getenv("CARTESIA_VERSION")

        logger.debug(f"Connecting to Cartesia WebSocket at {ws_url}")

        async with websockets.connect(
                ws_url,
                extra_headers={
                    "X-api-key": api_key,
                    "Cartesia-Version": cartesia_version,
                }) as websocket:

            logger.debug("Connected to Cartesia WebSocket")

            for segment in segments:
                # Generate a valid context ID
                context_id = uuid.uuid4().hex
                logger.debug(f"Generated context ID for segment '{segment}': {context_id}")

                # Prepare the message dictionary
                message = {
                    "model_id": "sonic-english",
                    "transcript": segment,
                    "voice": {
                        "mode": "id",
                        "id": "a0e99841-438c-4a64-b679-ae501e7d6091",
                        "__experimental_controls": {
                        "speed": "normal",
                        "emotion": [
                            "positivity:high",
                            "curiosity"
                            ]
                        }
                    },
                    "language": "en",
                    "context_id": context_id,
                    "output_format": {
                        "container": "raw",
                        "encoding": "pcm_f32le",
                        "sample_rate": 44100
                    },
                    "add_timestamps": True,
                    "continue": True
                }

                logger.debug(f"Sending request to Cartesia for segment: {json.dumps(message)}")

                # Send the message to the Cartesia WebSocket
                await websocket.send(json.dumps(message))
                logger.debug("Message sent to Cartesia API")

                # Await response from the WebSocket and yield audio chunks as they arrive
                async for response in websocket:
                    response_data = json.loads(response)

                    if response_data.get("type") == "error":
                        logger.error(f"Error response from Cartesia API: {response_data}")
                        break

                    # Handle "chunk" type messages which contain audio data
                    if response_data.get("type") == "chunk" and "data" in response_data:
                        # Decode the Base64 audio data
                        audio_data = base64.b64decode(response_data["data"])
                        logger.debug(f"Decoded audio chunk of size: {len(audio_data)} bytes")
                        yield audio_data

                    # Handle "done" type messages indicating the process is complete
                    if response_data.get("type") == "done":
                        logger.debug(f"Received 'done' response from Cartesia API: {response_data}")
                        break

    except websockets.exceptions.InvalidStatusCode as e:
        logger.error(f"WebSocket connection failed with HTTP status code: {e.status_code}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise

