// src/components/InterviewInterface.tsx
import React, { useState, useRef, useEffect } from "react";
import { useTranscription } from "../hooks/useTranscription";

const InterviewInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    id: 1,
    text: "Tell me about a challenging project you've worked on and how you handled it.",
  });
  const [uploadedCV, setUploadedCV] = useState<File | null>(null);
  const [jobLink, setJobLink] = useState("");
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [hasWebcamPermission, setHasWebcamPermission] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transcriptionMutation = useTranscription();

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    let mounted = true;

    const initializeWebcam = async () => {
      try {
        addDebugLog("Initializing webcam...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });

        addDebugLog("Got media stream");
        addDebugLog(`Video tracks: ${stream.getVideoTracks().length}`);
        addDebugLog(`Audio tracks: ${stream.getAudioTracks().length}`);

        if (mounted) {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            addDebugLog("Video preview started");
          }
          streamRef.current = stream;
          setHasWebcamPermission(true);
          setError("");
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        addDebugLog(`Webcam error: ${err instanceof Error ? err.message : String(err)}`);
        setHasWebcamPermission(false);
        setError(err instanceof Error ? err.message : 'Could not access camera and microphone');
      }
    };

    if (isInterviewStarted) {
      initializeWebcam();
    }

    return () => {
      mounted = false;
      if (streamRef.current) {
        addDebugLog("Cleaning up media stream");
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isInterviewStarted]);

  const handleStartRecording = () => {
    if (!streamRef.current) {
      setError("No active stream found");
      return;
    }

    try {
      addDebugLog("Starting recording...");
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          addDebugLog(`Received chunk: ${event.data.size} bytes`);
        }
      };

      // Request data every second
      mediaRecorder.start(1000);
      addDebugLog(`MediaRecorder started with state: ${mediaRecorder.state}`);
      
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setError("");
    } catch (err) {
      addDebugLog(`Recording start error: ${err instanceof Error ? err.message : String(err)}`);
      setError("Failed to start recording: " + (err instanceof Error ? err.message : String(err)));
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      addDebugLog("Stopping recording...");

      try {
        // Create a promise that resolves when we get the final chunk
        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
              addDebugLog("MediaRecorder stopped");
              resolve();
            };
            mediaRecorderRef.current.stop();
          }
        });

        setIsRecording(false);
        
        // Create and check video blob
        const videoBlob = new Blob(chunksRef.current, { 
          type: 'video/webm;codecs=vp8,opus' 
        });
        
        addDebugLog(`Final blob created. Size: ${videoBlob.size} bytes`);
        addDebugLog(`Number of chunks: ${chunksRef.current.length}`);

        if (videoBlob.size === 0) {
          throw new Error("Recording is empty");
        }

        // Create a debug video element
        const url = URL.createObjectURL(videoBlob);
        addDebugLog("Created blob URL for preview");

        // Try transcription
        if (videoBlob.size > 0) {
          addDebugLog("Starting transcription...");
          const result = await transcriptionMutation.mutateAsync(videoBlob);
          addDebugLog(`Transcription received: ${result.text.substring(0, 50)}...`);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addDebugLog(`Error in stop recording: ${errorMessage}`);
        setError(`Failed to process recording: ${errorMessage}`);
      }
    }
  };

  // ... rest of your component code ...

  // Add debug panel to your UI
  const renderDebugPanel = () => (
    <div className="fixed bottom-0 right-0 w-96 max-h-64 overflow-y-auto bg-black bg-opacity-80 text-white p-4 text-xs font-mono">
      <h3 className="text-sm font-bold mb-2">Debug Log</h3>
      {debugInfo.map((log, i) => (
        <div key={i} className="mb-1">{log}</div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Your existing JSX */}
      {renderDebugPanel()}
    </div>
  );
};

export default InterviewInterface;