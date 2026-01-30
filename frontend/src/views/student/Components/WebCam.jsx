import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as cocossd from '@tensorflow-models/coco-ssd';
import Webcam from 'react-webcam';
import { drawRect } from './utilities';
import { Box, Card } from '@mui/material';
import swal from 'sweetalert';
import { UploadClient } from '@uploadcare/upload-client';
import useBackgroundVoiceDetection from './useBackgroundVoiceDetection';
import useBrowserLock from './useBrowserLock';

const client = new UploadClient({ publicKey: 'e69ab6e5db6d4a41760b' });

export default function Home({
  cheatingLog,
  updateCheatingLog,
  isExamStarted   // ✅ NEW PROP
}) {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [lastDetectionTime, setLastDetectionTime] = useState({});
  const [isExamTerminated, setIsExamTerminated] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  useEffect(() => {
    setExamStarted(true);
  }, []);



  // ✅ Central violation counters (UNCHANGED)
  const countsRef = useRef({
    noFaceCount: 0,
    multipleFaceCount: 0,
    cellPhoneCount: 0,
    prohibitedObjectCount: 0,
    backgroundVoiceCount: 0,
    
    tabSwitchCount: 0,
    windowBlurCount: 0,
    shortcutKeyCount: 0,
    fullscreenExitCount: 0
  });

  // ======================================================
  // ✅ SINGLE VIOLATION ENGINE (SOURCE OF TRUTH)
  // ======================================================
  const checkAndUpdateViolation = async (type, condition, message) => {
    const now = Date.now();
    if (isExamTerminated) return false;

    if (condition && now - (lastDetectionTime[type] || 0) >= 3000) {
      setLastDetectionTime(prev => ({ ...prev, [type]: now }));

      countsRef.current[`${type}Count`]++;

      const totalViolations = Object.values(countsRef.current)
        .reduce((sum, count) => sum + count, 0);

      const updateObj = {
        ...cheatingLog,
        noFaceCount: countsRef.current.noFaceCount,
        multipleFaceCount: countsRef.current.multipleFaceCount,
        cellPhoneCount: countsRef.current.cellPhoneCount,
        prohibitedObjectCount: countsRef.current.prohibitedObjectCount,
        backgroundVoiceCount: countsRef.current.backgroundVoiceCount
      };

      updateCheatingLog(updateObj);

      if (totalViolations >= 5) {
        setIsExamTerminated(true);
        await swal({
          title: 'Exam Terminated',
          text: 'You have reached 5 violations.',
          icon: 'error',
          buttons: { confirm: 'OK' }
        });
        navigate('/');
        return true;
      }

      swal(
        message,
        `Violation #${countsRef.current[`${type}Count`]} (Total: ${totalViolations}/5)`,
        'warning'
      );

      return true;
    }
    return false;
  };

  // ======================================================
  // 🔊 BACKGROUND VOICE DETECTION (GATED)
  // ======================================================
  useBackgroundVoiceDetection({
    checkAndUpdateViolation,
    isExamTerminated,
    isExamStarted   // ✅ KEY FIX
  });


  // ===============================
  // 🔒 BROWSER LOCK
  // ===============================
  useBrowserLock({
    isExamStarted,
    isExamTerminated,
    checkAndUpdateViolation
  });

  // ======================================================
  // 🎥 VISION AI (UNCHANGED)
  // ======================================================
  const runCoco = async () => {
    const net = await cocossd.load();
    setInterval(() => detect(net), 1000);
  };

  const detect = async (net) => {
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const obj = await net.detect(video);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      drawRect(obj, ctx);

      let personCount = 0;
      let faceDetected = false;

      obj.forEach(el => {
        if (el.class === 'person') {
          faceDetected = true;
          personCount++;
        }

        if (el.class === 'cell phone') {
          checkAndUpdateViolation('cellPhone', true, 'Cell Phone Detected');
        }

        if (el.class === 'book' || el.class === 'laptop') {
          checkAndUpdateViolation(
            'prohibitedObject',
            true,
            'Prohibited Object Detected'
          );
        }
      });

      if (personCount > 1) {
        checkAndUpdateViolation(
          'multipleFace',
          true,
          'Multiple Faces Detected'
        );
      }

      if (!faceDetected) {
        checkAndUpdateViolation(
          'noFace',
          true,
          'Face Not Visible'
        );
      }
    }
  };

  useEffect(() => {
    runCoco();
  }, []);

  // ======================================================
  // UI
  // ======================================================
  return (
    <Box>
      <Card
        variant="outlined"
        sx={{ position: 'relative', width: '100%', height: '100%' }}
      >
        <Webcam
          ref={webcamRef}
          audio={true}
          muted={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user'
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10
          }}
        />
      </Card>
    </Box>
  );
}
