import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { HandData, GestureType } from '../types';

interface HandControllerProps {
  onHandUpdate: (data: HandData) => void;
}

// Global singleton to prevent double-initialization in StrictMode
let gestureRecognizerPromise: Promise<GestureRecognizer> | null = null;

const HandController: React.FC<HandControllerProps> = ({ onHandUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastPredictionTimeRef = useRef<number>(0);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    let active = true;

    const setup = async () => {
      // 1. Initialize MediaPipe (Singleton Pattern)
      if (!gestureRecognizerPromise) {
        gestureRecognizerPromise = (async () => {
             console.log("MediaPipe: Starting initialization...");
             const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
            );
            
            // Try GPU first
            try {
                const recognizer = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });
                console.log("MediaPipe: GPU initialized successfully");
                return recognizer;
            } catch (e) {
                console.warn("MediaPipe GPU init failed, switching to CPU", e);
                 const recognizer = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/1/gesture_recognizer.task",
                        delegate: "CPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });
                console.log("MediaPipe: CPU initialized successfully");
                return recognizer;
            }
        })();
      }

      // Wait for initialization to complete
      try {
          const recognizer = await gestureRecognizerPromise;
          if (active) {
              gestureRecognizerRef.current = recognizer;
          }
      } catch (err) {
          console.error("MediaPipe Init Error:", err);
      }

      // 2. Start Webcam
      if (videoRef.current && active) {
           try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                  facingMode: "user",
                  frameRate: { ideal: 30 }
                }
              });
              
              if (videoRef.current && active) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsVideoReady(true);
              }
           } catch (err) {
               console.error("Webcam Error:", err);
           }
      }
    };

    setup();

    return () => {
      active = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const predict = useCallback(() => {
    const video = videoRef.current;
    const recognizer = gestureRecognizerRef.current;

    if (video && !video.paused && !video.ended && video.readyState >= 2) {
      const nowInMs = performance.now();
      // Throttle: 10 FPS (100ms)
      if (nowInMs - lastPredictionTimeRef.current > 100) {
         if (recognizer) {
             if (video.currentTime !== lastVideoTimeRef.current) {
                lastVideoTimeRef.current = video.currentTime;
                lastPredictionTimeRef.current = nowInMs;

                try {
                    const results = recognizer.recognizeForVideo(video, nowInMs);
                    
                    let gesture = GestureType.None;
                    let x = 0.5;
                    let y = 0.5;
                    let isPinching = false;
                    let isTracked = false;

                    if (results.gestures.length > 0 && results.landmarks.length > 0) {
                         isTracked = true;
                         const topGesture = results.gestures[0][0];
                         // Confidence threshold
                         if (topGesture.score > 0.5) {
                             gesture = topGesture.categoryName as GestureType;
                         }
                         const landmarks = results.landmarks[0];
                         const thumbTip = landmarks[4];
                         const indexTip = landmarks[8];
                         
                         // Calculate Pinch
                         const distance = Math.sqrt(
                            Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
                         );
                         if (distance < 0.1) isPinching = true;
                         
                         // Coordinates (Mirrored X)
                         x = 1 - indexTip.x;
                         y = indexTip.y;
                    }
                    onHandUpdate({ gesture, x, y, isPinching, isTracked });
                } catch(e) {
                    console.error("Prediction error", e);
                }
             }
         }
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  }, [onHandUpdate]);

  useEffect(() => {
      if (isVideoReady) {
          requestRef.current = requestAnimationFrame(predict);
      }
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      }
  }, [isVideoReady, predict]);

  return (
    <div className="fixed bottom-0 right-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default HandController;