import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { HandData, GestureType } from '../types';

interface HandControllerProps {
  onHandUpdate: (data: HandData) => void;
}

const HandController: React.FC<HandControllerProps> = ({ onHandUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const isInitializingRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    const initMediaPipe = async () => {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!active) {
            isInitializingRef.current = false;
            return;
        }

        try {
            // Attempt GPU first (Float16)
            gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
            });
            console.log("MediaPipe: GPU initialized");
        } catch (gpuError) {
            // Quietly fallback to CPU without raising alarms
            if (!active) {
                isInitializingRef.current = false;
                return;
            }

            gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/1/gesture_recognizer.task",
                    delegate: "CPU"
                },
                runningMode: "VIDEO",
                numHands: 1
            });
            console.log("MediaPipe: CPU initialized");
        }
        
        if (active) {
            startWebcam();
        }
      } catch (error) {
        console.error("MediaPipe Init Error:", error);
      } finally {
        isInitializingRef.current = false;
      }
    };

    if (!gestureRecognizerRef.current) {
        initMediaPipe();
    }

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
      if (gestureRecognizerRef.current) {
          gestureRecognizerRef.current.close();
          gestureRecognizerRef.current = null;
      }
    };
  }, []);

  const startWebcam = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
        predict();
      }
    } catch (err) {
      console.error("Webcam Error:", err);
    }
  };

  const predict = () => {
    const video = videoRef.current;
    const recognizer = gestureRecognizerRef.current;

    if (video && recognizer && !video.paused && !video.ended && video.readyState >= 2) {
      const nowInMs = performance.now();
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        
        try {
          const results = recognizer.recognizeForVideo(video, nowInMs);

          let gesture = GestureType.None;
          let x = 0.5;
          let y = 0.5;
          let isPinching = false;

          if (results.gestures.length > 0 && results.landmarks.length > 0) {
            const topGesture = results.gestures[0][0];
            const score = topGesture.score;
            
            if (score > 0.5) {
                gesture = topGesture.categoryName as GestureType;
            }
            
            const landmarks = results.landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            
            const distance = Math.sqrt(
              Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
            );
            
            if (distance < 0.1) { 
              isPinching = true;
            }

            x = 1 - indexTip.x; 
            y = indexTip.y;
          }

          onHandUpdate({ gesture, x, y, isPinching });

        } catch (e) {
           // Ignore single frame errors
        }
      }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

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