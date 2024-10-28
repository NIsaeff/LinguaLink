from fastapi import FastAPI, WebSocket
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from cartesia_socket import process_audio_in_segments
import wave
import io
import wave
import asyncio
import logging

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='app.log',
    filemode='w'
)
logger = logging.getLogger(__name__)

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse("static/audio_stream.html")

# Shared data for communication between WebSocket endpoints
shared_data = {"text": ""}

# Logging inside the /ws and /ws-audio WebSocket endpoints
@app.websocket("/ws")
async def websocket_text_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.debug("WebSocket for text data accepted")
    while True:
        try:
            data = await websocket.receive_text()
            logger.debug(f"Received text data from client: {data}")
            shared_data["text"] = data
            await websocket.send_text(f"Message received: {data}")
            logger.debug("Sent acknowledgment to client")
        except Exception as e:
            logger.error(f"Error in text WebSocket: {e}")
            break



def calculate_audio_duration(audio_data: bytes, sample_rate: int = 44100) -> float:
    # Calculate duration from byte size and sample rate
    num_samples = len(audio_data) // 4  # assuming 32-bit (4 bytes per sample)
    return num_samples / sample_rate

@app.websocket("/ws-audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.debug("WebSocket for audio data accepted")

    try:
        text_data = shared_data.get("text", "")
        logger.debug(f"Text data for audio generation: '{text_data}'")

        if text_data:
            # Process the audio data in segments and send it as chunks are received
            async for audio_chunk in process_audio_in_segments(text_data):
                # Convert PCM to WAV format for compatibility
                wav_audio_chunk = pcm_to_wav(audio_chunk, sample_rate=44100)

                # Send the WAV-formatted audio chunk
                await websocket.send_bytes(wav_audio_chunk)

                # Calculate chunk duration and use it as the delay
                chunk_duration = calculate_audio_duration(audio_chunk, sample_rate=44100)
                await asyncio.sleep(chunk_duration)

            # Notify that the processing is complete
            await websocket.send_text("Audio processing completed. Closing connection.")
            logger.debug("Sent audio completion message to client")
        else:
            logger.warning("No text data available, sending no data warning")
            await websocket.send_text("No text data available.")
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        await websocket.send_text(f"Error: {str(e)}")

    # Close the WebSocket connection once audio processing is complete
    await websocket.close()
    logger.debug("Audio WebSocket connection closed")

def pcm_to_wav(audio_data: bytes, sample_rate: int = 44100) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono audio
        wav_file.setsampwidth(4)  # 32-bit (4 bytes per sample, PCM_F32LE)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_data)
    
    buffer.seek(0)  # Rewind the buffer to the beginning
    return buffer.read()
