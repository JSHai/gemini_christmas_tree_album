import React, { useState } from 'react';

interface ControlPanelProps {
  currentGesture: string;
  onMusicUpload: (file: File) => void;
  onBgUpload: (file: File) => void;
  onPhotosUpload: (files: FileList) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ currentGesture, onMusicUpload, onBgUpload, onPhotosUpload }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`absolute bottom-6 left-6 z-40 transition-all duration-500 ${isOpen ? 'w-80' : 'w-12'}`}>
      <div className="bg-black/60 backdrop-blur-xl border border-[#FFD700]/30 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 flex items-center justify-center text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
        >
          {isOpen ? '▼ 隐藏控制' : '⚙'}
        </button>

        {isOpen && (
          <div className="p-5 space-y-6 text-sm text-[#FFE4B5]">
            
            {/* Gesture Guide */}
            <div className="space-y-3">
              <h3 className="font-bold border-b border-[#FFD700]/20 pb-1 text-[#FFD700]">手势说明</h3>
              <div className="grid grid-cols-[20px_1fr] gap-2 items-center">
                <span className="text-xl">✊</span> <span><strong>握拳:</strong> 聚合圣诞树</span>
                <span className="text-xl">✋</span> <span><strong>张开手掌:</strong> 打开相册长廊</span>
                <span className="text-xl">👌</span> <span><strong>捏合手指:</strong> 选中放大照片</span>
              </div>
              <div className="mt-2 text-xs bg-[#FFD700]/10 p-2 rounded text-center">
                当前识别: <span className="font-mono text-white ml-2">{currentGesture}</span>
              </div>
            </div>

            {/* Customization */}
            <div className="space-y-3">
              <h3 className="font-bold border-b border-[#FFD700]/20 pb-1 text-[#FFD700]">氛围设置</h3>
              
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider opacity-70">上传背景音乐</label>
                <input 
                  type="file" 
                  accept="audio/*"
                  onChange={(e) => e.target.files?.[0] && onMusicUpload(e.target.files[0])}
                  className="block w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#FFD700] file:text-black hover:file:bg-[#FFC700] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider opacity-70">上传背景图片</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && onBgUpload(e.target.files[0])}
                  className="block w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#FFD700] file:text-black hover:file:bg-[#FFC700] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider opacity-70">上传相册文件夹</label>
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  // @ts-ignore - Allows folder selection in supported browsers
                  webkitdirectory=""
                  onChange={(e) => e.target.files && onPhotosUpload(e.target.files)}
                  className="block w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#FFD700] file:text-black hover:file:bg-[#FFC700] cursor-pointer"
                />
                <p className="text-[10px] text-gray-400">支持批量选择或文件夹上传</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;