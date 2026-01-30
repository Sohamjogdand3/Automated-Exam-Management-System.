import { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

const YAMNET_MODEL_URL =
  'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1';

const VAD_THRESHOLD = 0.006;   // energy threshold
const VAD_HOLD_FRAMES = 2;    // consecutive frames required

export default function useBackgroundVoiceDetection({
  checkAndUpdateViolation,
  isExamStarted,
  isExamTerminated
}) {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const bufferRef = useRef(null);
  const modelRef = useRef(null);

  const lastInferenceTimeRef = useRef(0);
  const vadFramesRef = useRef(0);
  const speechStartTimeRef = useRef(null);

  const streamRef = useRef(null);
  const rafRef = useRef(null);

  // ======================================================
  // 🔊 START / STOP EXACTLY LIKE FACE DETECTION
  // ======================================================
  useEffect(() => {
    // 🚫 Do nothing until exam starts
    if (!isExamStarted || isExamTerminated) return;

    let cancelled = false;

    const init = async () => {
      try {
        // 🎤 Mic access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        analyserRef.current = analyser;
        bufferRef.current = new Float32Array(analyser.fftSize);

        source.connect(analyser);

        // 🧠 Load YAMNet ONCE per exam
        modelRef.current = await tf.loadGraphModel(
          YAMNET_MODEL_URL,
          { fromTFHub: true }
        );

        console.log('✅ YAMNet voice model loaded');

        detectLoop();
      } catch (err) {
        console.error('🎤 Voice detection init failed:', err);
      }
    };

    const detectLoop = async () => {
      if (
        cancelled ||
        !isExamStarted ||
        isExamTerminated ||
        !analyserRef.current ||
        !modelRef.current
      ) {
        return;
      }

      // 🔄 Resume audio if browser suspended it
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const now = Date.now();
      if (now - lastInferenceTimeRef.current < 1000) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      lastInferenceTimeRef.current = now;

      analyserRef.current.getFloatTimeDomainData(bufferRef.current);

      // 🔊 RMS energy (VAD)
      let energy = 0;
      for (let i = 0; i < bufferRef.current.length; i++) {
        energy += bufferRef.current[i] ** 2;
      }
      const rms = Math.sqrt(energy / bufferRef.current.length);

      if (rms > VAD_THRESHOLD) {
        vadFramesRef.current += 1;
      } else {
        vadFramesRef.current = 0;
        speechStartTimeRef.current = null;
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      if (vadFramesRef.current < VAD_HOLD_FRAMES) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // 🧠 AI inference
      const waveform = tf.tensor1d(bufferRef.current);
      const outputs = modelRef.current.predict(waveform);
      const scoresTensor = outputs[0];
      const scores = await scoresTensor.data();

      outputs.forEach(t => t.dispose());
      waveform.dispose();

      const speechScore = Math.max(scores[0], scores[1]); // speech / conversation

      if (speechScore > 0.6) {
        if (!speechStartTimeRef.current) {
          speechStartTimeRef.current = now;
        }

        const duration = now - speechStartTimeRef.current;

        if (duration >= 1500) {
          checkAndUpdateViolation(
            'backgroundVoice',
            true,
            'Background Voice Detected'
          );
          speechStartTimeRef.current = null;
        }
      } else {
        speechStartTimeRef.current = null;
      }

      rafRef.current = requestAnimationFrame(detectLoop);
    };

    init();

    // ======================================================
    // CLEANUP (LIKE FACE DETECTION)
    // ======================================================
    return () => {
      cancelled = true;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== 'closed'
      ) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      analyserRef.current = null;
      modelRef.current = null;
    };
  }, [isExamStarted, isExamTerminated, checkAndUpdateViolation]);
}
