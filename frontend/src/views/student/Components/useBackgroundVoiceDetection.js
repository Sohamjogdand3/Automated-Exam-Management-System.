import { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

const YAMNET_MODEL_URL =
  'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1';

const VAD_THRESHOLD = 0.006;   // energy threshold
const VAD_HOLD_FRAMES = 2;    // consecutive frames required


export default function useBackgroundVoiceDetection({
  checkAndUpdateViolation,
  isExamTerminated,
  isExamStarted
}) {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const bufferRef = useRef(null);
  const modelRef = useRef(null);

  const speechFramesRef = useRef(0);
  const lastInferenceTimeRef = useRef(0);

  const vadFramesRef = useRef(0);
  const speechStartTimeRef = useRef(null);



  useEffect(() => {
    if (isExamTerminated) return;

    let stream;

    const init = async () => {
      try {
        // 1️⃣ Mic access
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        analyserRef.current = analyser;
        bufferRef.current = new Float32Array(analyser.fftSize);

        source.connect(analyser);

        // 2️⃣ Load YAMNet ONCE
        modelRef.current = await tf.loadGraphModel(
          YAMNET_MODEL_URL,
          { fromTFHub: true }
        );

        console.log('✅ YAMNet model loaded');

        detectLoop();
      } catch (err) {
        console.error('🎤 Audio init failed:', err);
      }
    };

    const detectLoop = async () => {
      if (
        !analyserRef.current ||
        !modelRef.current ||
        isExamTerminated
      ) {
        requestAnimationFrame(detectLoop);
        return;
      }

      const now = Date.now();
      if (now - lastInferenceTimeRef.current < 1000) {
        requestAnimationFrame(detectLoop);
        return;
      }
      lastInferenceTimeRef.current = now;

      analyserRef.current.getFloatTimeDomainData(bufferRef.current);

      // 3️⃣ Voice Activity Detection (RMS)
      let energy = 0;
      for (let i = 0; i < bufferRef.current.length; i++) {
        energy += bufferRef.current[i] ** 2;
      }
      const rms = Math.sqrt(energy / bufferRef.current.length);
      console.log('RMS:', rms.toFixed(4));


      // 🔊 Energy-based VAD (Problem 4)
        if (rms > VAD_THRESHOLD) {
        vadFramesRef.current += 1;
        } else {
        vadFramesRef.current = 0;
        speechFramesRef.current = 0;
        requestAnimationFrame(detectLoop);
        return;
        }

        // Require sustained sound before AI inference
        if (vadFramesRef.current < VAD_HOLD_FRAMES) {
        requestAnimationFrame(detectLoop);
        return;
        }


      // 4️⃣ AI inference (CORRECT WAY)
      const waveform = tf.tensor1d(bufferRef.current);

      const outputs = modelRef.current.predict(waveform);
      const scoresTensor = outputs[0]; // FIRST tensor = scores

      const scores = await scoresTensor.data();

      // Cleanup
      outputs.forEach(t => t.dispose());
      waveform.dispose();

      // 5️⃣ Speech decision
      const speechScore = Math.max(scores[0], scores[1]); // speech, conversation

      // ⏱️ Time-based sustained speech detection (FIXED LOGIC)
      if (speechScore > 0.6) {
        if (!speechStartTimeRef.current) {
          speechStartTimeRef.current = now;
        }

        const speechDuration = now - speechStartTimeRef.current;
        console.log('🗣 Speech duration (ms):', speechDuration);

        // 🔔 1500 ms continuous speech → violation
        if (speechDuration >= 1500) {
          console.log('🔊 Background voice detected');

          checkAndUpdateViolation(
            'backgroundVoice',
            true,
            'Background Voice Detected'
          );

          // reset after violation
          speechStartTimeRef.current = null;
        }
      } else {
        // reset if speech breaks
        speechStartTimeRef.current = null;
      }

      requestAnimationFrame(detectLoop);

    };

    init();

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        if (
            audioContextRef.current &&
            audioContextRef.current.state !== 'closed'
        ) {
            audioContextRef.current.close();
        }
    };

  }, [checkAndUpdateViolation, isExamTerminated]);
}

