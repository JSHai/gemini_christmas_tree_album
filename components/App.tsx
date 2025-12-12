import React, { useState, useCallback, useRef } from 'react';
import Experience from './components/Experience';
import HandController from './components/HandController';
import ControlPanel from './components/ControlPanel';
import { HandData, GestureType } from './types';

const App: React.FC = () => {
  const [handData, setHandData] = useState<HandData>({
    gesture: GestureType.None,
    x: 0.5,
    y: 0.5,
    isPinching: false,
    isTracked: false,
  });
  const [mode, setMode] = useState<'tree' | 'gallery'>('tree');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleHandUpdate = useCallback((data: HandData) => {
    setHandData(data);
  }, []);

  const handleMusicUpload = (file: File) => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }
    const url = URL.createObjectURL(file);
    audioRef.current = new Audio(url);
    audioRef.current.loop = true;
    audioRef.current.play().catch(e => console.log("Audio play failed:", e));
  };

  const handleBgUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setBgImage(url);
  };

  const handlePhotosUpload = (files: FileList) => {
    const urls: string[] = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        urls.push(URL.createObjectURL(file));
      }
    });
    if (urls.length > 0) {
      setUserPhotos(urls);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden text-white select-none">
      {/* 3D Scene */}
      <Experience 
        handData={handData} 
        setMode={setMode} 
        bgImage={bgImage}
        userPhotos={userPhotos}
      />

      {/* Hand Controller (Logic only, Hidden UI) */}
      <HandController onHandUpdate={handleHandUpdate} />

      {/* Control Panel */}
      <ControlPanel 
        currentGesture={handData.gesture}
        onMusicUpload={handleMusicUpload}
        onBgUpload={handleBgUpload}
        onPhotosUpload={handlePhotosUpload}
      />

      {/* Hand Cursor */}
      {(handData.gesture !== GestureType.None || handData.isPinching) && (
        <div 
            className="absolute w-8 h-8 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_20px_#FFD700] transition-all duration-100 z-50 border border-[#FFD700]"
            style={{ 
                left: `${handData.x * 100}%`, 
                top: `${handData.y * 100}%`,
                backgroundColor: handData.isPinching ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 215, 0, 0.2)',
                scale: handData.isPinching ? 0.6 : 1,
                boxShadow: handData.isPinching ? '0 0 30px #FFD700' : '0 0 10px #FFD700'
            }}
        >
          <div className="absolute inset-0 animate-ping rounded-full bg-[#FFD700] opacity-20"></div>
        </div>
      )}
    </div>
  );
};

export default App;