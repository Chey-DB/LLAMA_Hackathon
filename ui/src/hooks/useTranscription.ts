import { useMutation } from "@tanstack/react-query";
import Groq from "groq-sdk";

interface TranscriptionResult {
  text: string;
  success: boolean;
}

export const useTranscription = () => {
  return useMutation<TranscriptionResult, Error, Blob>({
    mutationFn: async (videoBlob: Blob) => {
      try {
        // Convert Blob to File
        const videoFile = new File([videoBlob], "video.webm", {
          type: "video/webm",
        });

        // Initialize Groq client
        const groq = new Groq({
          apiKey: import.meta.env.VITE_GROQ_API_KEY,
          dangerouslyAllowBrowser: true,
        });

        // Perform transcription directly on video
        const result = await groq.audio.transcriptions.create({
          file: videoFile,
          model: "whisper-large-v3-turbo",
          language: "en",
          temperature: 0.0,
        });
        console.log(result.text);
        // Return transcription result
        return {
          text: result.text,
          success: true,
        };
      } catch (error) {
        console.error("Transcription error:", error);
        throw error;
      }
    },
  });
};
