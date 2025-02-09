import express from "express";
import cors from "cors";
import { createClient } from "@deepgram/sdk";

const app = express();
const port = 5000;
app.use(cors());
app.use(express.json());

const deepgram = createClient("dade834708f60340f515b0565846da91c7b7d745");

app.post("/speak", async (req, res) => {
  try {
    const { text } = req.body;

    const response = await deepgram.speak.request(
      { text },
      {
        model: "aura-asteria-en",
        encoding: "linear16",
        container: "wav",
      }
    );

    const stream = await response.getStream();
    const buffer = await getAudioBuffer(stream);

    res.set({
      "Content-Type": "audio/wav",
      "Content-Disposition": 'attachment; filename="speech.wav"',
    });
    res.send(buffer);
  } catch (error) {
    console.error("Error generating audio:", error);
    res.status(500).send("Error generating audio");
  }
});

// Convert response stream to buffer
const getAudioBuffer = async (response) => {
  const reader = response.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  return Buffer.from(dataArray.buffer);
};

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
