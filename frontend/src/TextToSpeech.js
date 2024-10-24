import React, { useState } from 'react';
import { useTTS } from '@cartesia/cartesia-js/react';

function TextToSpeech() {
  const tts = useTTS({
    apiKey: "your-api-key",
    sampleRate: 44100,
  });

  const [text, setText] = useState("");

  const handlePlay = async () => {
    if (text.trim() === "") {
      alert("Please enter some text before playing.");
      return;
    }

    try {
      await tts.buffer({
        model_id: "sonic-english",
        voice: {
          mode: "id",
          id: "a0e99841-438c-4a64-b679-ae501e7d6091",
        },
        transcript: text,
      });

      await tts.play();
    } catch (error) {
      console.error("Error during TTS playback:", error);
      alert("An error occurred during playback. Please try again.");
    }
  };

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to speak"
      />
      <button onClick={handlePlay}>Play</button>
    </div>
  );
}

export default TextToSpeech;

