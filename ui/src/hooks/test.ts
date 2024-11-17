// src/hooks/useTranscription.ts
import { useMutation } from "@tanstack/react-query";
import Groq from "groq-sdk";

interface TranscriptionResult {
  text: string;
  success: boolean;
}

export const useTranscription2 = () => {
  return useMutation<TranscriptionResult, Error, Blob>({
    mutationFn: async (videoBlob: Blob) => {
      try {
        // First extract audio from video
        const audioBlob = await extractAudioFromVideo(videoBlob);

        // Convert blob to File object
        const audioFile = new File([audioBlob], "audio.wav", {
          type: "audio/wav",
        });

        // Initialize Groq client
        const groq = new Groq({
          apiKey: import.meta.env.VITE_GROQ_API_KEY,
          dangerouslyAllowBrowser: true,
        });

        // Get transcription
        const result = await groq.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-large-v3-turbo",
          language: "en",
          temperature: 0.0,
        });

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
const extractAudioFromVideo = async (videoBlob: Blob): Promise<Blob> => {
  console.log("Starting audio extraction from video blob:", {
    size: videoBlob.size,
    type: videoBlob.type,
  });

  return new Promise((resolve, reject) => {
    const audioContext = new AudioContext();
    const videoElement = document.createElement("video");

    // Force the video to load completely
    videoElement.preload = "auto";

    // Create object URL and set video source
    const videoUrl = URL.createObjectURL(videoBlob);
    console.log("Created video URL:", videoUrl);

    // Create a timeout to prevent infinite waiting
    const timeoutId = setTimeout(() => {
      reject(new Error("Timeout waiting for video duration"));
    }, 360000); // 6 minutes in milliseconds

    // Function to wait for duration
    const waitForDuration = () => {
      return new Promise<number>((resolveDuration, rejectDuration) => {
        let attempts = 0;
        const maxAttempts = 2000; // Try for 5 seconds (50 * 100ms)

        const checkDuration = () => {
          attempts++;
          console.log(
            `Attempt ${attempts} to get duration:`,
            videoElement.duration
          );

          if (
            Number.isFinite(videoElement.duration) &&
            videoElement.duration > 0
          ) {
            clearTimeout(timeoutId);
            resolveDuration(videoElement.duration);
          } else if (attempts >= maxAttempts) {
            rejectDuration(
              new Error(
                "Could not determine video duration after maximum attempts"
              )
            );
          } else {
            setTimeout(checkDuration, 100);
          }
        };

        checkDuration();
      });
    };

    videoElement.addEventListener("loadeddata", async () => {
      try {
        const duration = await waitForDuration();
        console.log("Final video duration:", duration);

        const mediaStream = audioContext.createMediaElementSource(videoElement);
        const destination = audioContext.createMediaStreamDestination();
        mediaStream.connect(destination);

        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        const audioChunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log("Audio data available, chunk size:", event.data.size);
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          console.log("Media recorder stopped");
          console.log("Total audio chunks:", audioChunks.length);

          const audioBlob = new Blob(audioChunks, {
            type: "audio/webm;codecs=opus",
          });

          console.log("Created audio blob:", {
            size: audioBlob.size,
            type: audioBlob.type,
          });

          // Cleanup
          URL.revokeObjectURL(videoUrl);
          resolve(audioBlob);
        };

        mediaRecorder.start(500);
        console.log("Media recorder started");

        // Resume audio context if needed
        if (audioContext.state === "suspended") {
          await audioContext.resume();
          console.log("Audio context resumed");
        }

        // Play the video
        videoElement.currentTime = 0;
        await videoElement.play();
        console.log("Video playback started");

        // Set up progress monitoring
        const checkInterval = setInterval(() => {
          console.log(
            "Current time:",
            videoElement.currentTime,
            "Duration:",
            duration
          );
          if (videoElement.currentTime >= duration - 0.1) {
            // Allow 100ms margin
            clearInterval(checkInterval);
            if (mediaRecorder.state === "recording") {
              console.log("Reached end of video, stopping recording");
              mediaRecorder.stop();
              videoElement.pause();
            }
          }
        }, 100);

        // Safety timeout
        setTimeout(() => {
          clearInterval(checkInterval);
          if (mediaRecorder.state === "recording") {
            console.log("Safety timeout reached, stopping recording");
            mediaRecorder.stop();
            videoElement.pause();
          }
        }, 330000); // 5.5 minutes in milliseconds
      } catch (err) {
        console.error("Error during audio extraction:", err);
        URL.revokeObjectURL(videoUrl);
        reject(err);
      }
    });

    // Handle video element errors
    videoElement.onerror = (e) => {
      console.error("Video element error:", e);
      URL.revokeObjectURL(videoUrl);
      clearTimeout(timeoutId);
      reject(new Error("Failed to load video"));
    };

    // Set the source last
    videoElement.src = videoUrl;
  });
};
