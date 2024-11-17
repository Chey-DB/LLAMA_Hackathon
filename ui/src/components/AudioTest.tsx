import React, { useEffect, useState } from "react";

const AudioLevelMonitor = () => {
  const [decibels, setDecibels] = useState(0);
  const [isSilent, setIsSilent] = useState(false);

  useEffect(() => {
    let audioContext;
    let analyser;
    let microphone;
    let javascriptNode;

    const silenceThreshold = -50; // Decibel threshold for silence
    const silenceDuration = 2500; // Duration in milliseconds to consider as silence
    let silenceStart = null;

    const handleSuccess = (stream) => {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        const arraySum = array.reduce((a, value) => a + value, 0);
        const average = arraySum / array.length;
        const decibelLevel = 20 * Math.log10(average / 255);
        setDecibels(decibelLevel.toFixed(2));

        if (decibelLevel < silenceThreshold) {
          if (!silenceStart) {
            silenceStart = performance.now();
          } else if (performance.now() - silenceStart > silenceDuration) {
            setIsSilent(true);
          }
        } else {
          silenceStart = null;
          setIsSilent(false);
        }
      };
    };

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(handleSuccess)
      .catch((err) => {
        console.error("Error accessing microphone:", err);
      });

    return () => {
      if (javascriptNode) javascriptNode.disconnect();
      if (microphone) microphone.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext) audioContext.close();
    };
  }, []);

  return (
    <div>
      <h2>Real-Time Audio Level Monitor</h2>
      <p>Decibel Level: {decibels} dB</p>
      <p>Status: {isSilent ? "Silence Detected" : "Sound Detected"}</p>
    </div>
  );
};

export default AudioLevelMonitor;
