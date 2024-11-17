import React, { useState, useRef, useEffect } from "react";
import { useTranscription } from "../hooks/useTranscription";

interface AudioLevels {
  db: number;
  isSilent: boolean;
}

const InterviewInterface = () => {
  const [isRecording, setIsRecording] = useState(false);
  const shouldCheck = useRef<boolean | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState({
    id: 1,
    text: "Tell me about a challenging project you've worked on and how you handled it.",
  });
  const [uploadedCV, setUploadedCV] = useState<File | null>(null);
  const [jobLink, setJobLink] = useState("");
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [hasWebcamPermission, setHasWebcamPermission] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingState, setRecordingState] = useState<
    "idle" | "countdown" | "recording" | "processing"
  >("idle");
  const [audioLevels, setAudioLevels] = useState<AudioLevels>({
    db: -Infinity,
    isSilent: false,
  });
  const [silenceTimer, setSilenceTimer] = useState<number>(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const javascriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const SILENCE_THRESHOLD = -50; // Decibel threshold for silence
  const SILENCE_DURATION = 2500; // Duration in milliseconds to consider as silence

  const transcriptionMutation = useTranscription();

  useEffect(() => {
    let mounted = true;

    const initializeWebcam = async () => {
      try {
        console.log("Initializing webcam...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });

        if (mounted) {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          streamRef.current = stream;
          setHasWebcamPermission(true);
          setError("");
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
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
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (javascriptNodeRef.current) {
        javascriptNodeRef.current.disconnect();
      }
    };
  }, [isInterviewStarted]);

  const initializeAudioAnalysis = (stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const microphone =
        audioContextRef.current.createMediaStreamSource(stream);
      javascriptNodeRef.current = audioContextRef.current.createScriptProcessor(
        2048,
        1,
        1
      );

      analyserRef.current.smoothingTimeConstant = 0.8;
      analyserRef.current.fftSize = 1024;

      microphone.connect(analyserRef.current);
      analyserRef.current.connect(javascriptNodeRef.current);
      javascriptNodeRef.current.connect(audioContextRef.current.destination);

      javascriptNodeRef.current.onaudioprocess = () => {
        if (!analyserRef.current) return;

        const array = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(array);
        const arraySum = array.reduce((a, value) => a + value, 0);
        const average = arraySum / array.length;
        const decibelLevel = 20 * Math.log10(average / 255);

        const isSilent = decibelLevel < SILENCE_THRESHOLD;

        setAudioLevels({
          db: Number.isFinite(decibelLevel) ? decibelLevel : -Infinity,
          isSilent,
        });

        if (isSilent) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = performance.now();
          } else {
            const silenceDuration = performance.now() - silenceStartRef.current;
            setSilenceTimer(Math.floor(silenceDuration));
            if (silenceDuration > SILENCE_DURATION && shouldCheck.current) {
              console.log(silenceDuration);
              handleStopRecording();
            }
          }
        } else {
          silenceStartRef.current = null;
          setSilenceTimer(0);
        }
      };

      return true;
    } catch (err) {
      console.error("Failed to initialize audio analysis:", err);
      return false;
    }
  };

  const startRecordingProcess = async () => {
    setRecordingStartTime(Date.now()); // Set the recording start time
    setRecordingState("countdown");
    setCountdown(3);
    shouldCheck.current = true;

    for (let i = 3; i > 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCountdown(i - 1);
    }

    await handleStartRecording();
    setRecordingState("recording");
  };

  const handleStartRecording = async () => {
    if (!streamRef.current) {
      setError("No active stream found");
      return;
    }
    silenceStartRef.current = null;
    try {
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm;codecs=vp8,opus",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      initializeAudioAnalysis(streamRef.current);
      mediaRecorder.start(1000);

      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setError("");
    } catch (err) {
      console.error("Recording start error:", err);
      setError(
        "Failed to start recording: " +
          (err instanceof Error ? err.message : String(err))
      );
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (mediaRecorderRef.current && recordingState !== "processing") {
      setRecordingState("processing");
      shouldCheck.current = false;
      try {
        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => resolve();
            mediaRecorderRef.current.stop();
          }
        });

        setIsRecording(false);
        setRecordingStartTime(null); // Reset the start time

        const videoBlob = new Blob(chunksRef.current, {
          type: "video/webm;codecs=vp8,opus",
        });

        if (videoBlob.size === 0) {
          throw new Error("Recording is empty");
        }

        if (videoBlob.size > 0) {
          const result = await transcriptionMutation.mutateAsync(videoBlob);
          handleNextQuestion();
          setRecordingState("idle");
        }
      } catch (err) {
        console.error("Error in stop recording:", err);
        setError(
          `Failed to process recording: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        setRecordingState("idle");
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

  const VolumeIndicator = () => {
    const volumePercentage = Math.max(
      0,
      Math.min(100, (audioLevels.db + 100) * 2)
    );

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">Volume:</span>
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${
              volumePercentage > 20 ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ width: `${volumePercentage}%` }}
          />
        </div>
        <span className="text-xs">{volumePercentage.toFixed(1)}%</span>
        {audioLevels.isSilent && (
          <span className="text-xs text-red-500">
            {silenceTimer > 0
              ? `Silent: ${(silenceTimer / 1000).toFixed(1)}s`
              : "Silent"}
          </span>
        )}
      </div>
    );
  };

  const renderRecordingStatus = () => {
    switch (recordingState) {
      case "countdown":
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-6xl font-bold">
              {countdown === 0 ? "Go!" : countdown}
            </div>
          </div>
        );
      case "recording":
        return (
          <div className="absolute top-4 right-4 flex flex-col gap-2 bg-gray-800 p-4 rounded-lg text-white">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              <span>Recording...</span>
            </div>
            <VolumeIndicator />
          </div>
        );
      case "processing":
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-xl">
              Processing your response...
              <div className="mt-4 h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 animate-progress" />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="w-1/3 min-h-screen bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">
                  Question {currentQuestion.id}
                </h2>
                <p className="text-lg mb-6">{currentQuestion.text}</p>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Click start when you're ready to answer.
                  </p>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="flex gap-4">
                    {recordingState === "idle" && (
                      <button
                        onClick={startRecordingProcess}
                        disabled={!hasWebcamPermission}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <span>🎥</span>
                        Start
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

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
              {renderRecordingStatus()}
            </div>

            <div className="bg-gray-800 text-white p-4">
              <div className="flex justify-between items-center max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span>🎤</span>
                    <span className="text-sm">
                      Audio Level: {audioLevels.isSilent ? "Silent" : "Active"}
                    </span>
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
