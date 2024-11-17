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
    setDebugInfo((prev) => [
      ...prev,
      `${new Date().toISOString()}: ${message}`,
    ]);
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
        addDebugLog(
          `Webcam error: ${err instanceof Error ? err.message : String(err)}`
        );
        setHasWebcamPermission(false);
        setError(
          err instanceof Error
            ? err.message
            : "Could not access camera and microphone"
        );
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
        mimeType: "video/webm;codecs=vp8,opus",
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
      addDebugLog(
        `Recording start error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setError(
        "Failed to start recording: " +
          (err instanceof Error ? err.message : String(err))
      );
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
          type: "video/webm;codecs=vp8,opus",
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
          addDebugLog(
            `Transcription received: ${result.text.substring(0, 50)}...`
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addDebugLog(`Error in stop recording: ${errorMessage}`);
        setError(`Failed to process recording: ${errorMessage}`);
      }
    }
  };

  const handleNextQuestion = () => {
    setCurrentQuestion((prev) => ({
      id: prev.id + 1,
      text: "How do you handle difficult situations in a team environment?",
    }));
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setUploadedCV(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedCV(files[0]);
    }
  };

  const renderDebugPanel = () => (
    <div className="fixed bottom-0 right-0 w-96 max-h-64 overflow-y-auto bg-black bg-opacity-80 text-white p-4 text-xs font-mono">
      <h3 className="text-sm font-bold mb-2">Debug Log</h3>
      {debugInfo.map((log, i) => (
        <div key={i} className="mb-1">
          {log}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {renderDebugPanel()}
      {!isInterviewStarted ? (
        <div className="p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg border shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6 border-b">
              <h3 className="text-2xl font-semibold">Start Your Interview</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Job Description Link
                </label>
                <input
                  type="url"
                  className="w-full p-2 border rounded-md"
                  placeholder="Paste job link here"
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Upload Your CV {uploadedCV && `(${uploadedCV.name})`}
                </label>
                <div
                  onClick={handleFileUploadClick}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <div className="mx-auto h-12 w-12 text-gray-400">📄</div>
                  <p className="mt-2 text-sm text-gray-600">
                    {uploadedCV
                      ? uploadedCV.name
                      : "Drag and drop your CV here, or click to browse"}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <button
                onClick={() => setIsInterviewStarted(true)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!uploadedCV || !jobLink}
              >
                Start Interview
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-screen">
          {/* Question Panel - Left Side */}
          <div className="w-1/3 min-h-screen bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">
                  Question {currentQuestion.id}
                </h2>
                <p className="text-lg mb-6">{currentQuestion.text}</p>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Take your time to think about your answer. Click record when
                    you're ready.
                  </p>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="flex gap-4">
                    {!isRecording ? (
                      <button
                        onClick={handleStartRecording}
                        disabled={!hasWebcamPermission}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <span>🎥</span>
                        Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={handleStopRecording}
                        className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                      >
                        <span>⬛</span>
                        Stop Recording
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {!isRecording && hasWebcamPermission && (
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={handleNextQuestion}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <span>➡️</span>
                  Submit and Continue
                </button>
              </div>
            )}
          </div>

          {/* Video Preview Panel - Right Side */}
          <div className="w-2/3 min-h-screen bg-gray-900 flex flex-col">
            <div className="flex-1 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {!hasWebcamPermission && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 bg-opacity-75">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-xl text-center">
                    Please allow camera access to begin the interview
                  </p>
                  {error && (
                    <p className="text-red-400 mt-2 text-center max-w-md">
                      Error: {error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Video Controls Overlay */}
            <div className="bg-gray-800 text-white p-4">
              <div className="flex justify-between items-center max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span>🎤</span>
                    <span className="text-sm">Audio Level: Active</span>
                  </div>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                    <span>Recording</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewInterface;
