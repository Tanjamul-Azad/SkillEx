'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShowcaseVideo {
  id: string;
  url: string;
  subtitle?: string;
  skillName: string;
  skillCategory?: string;
}

interface Props {
  videos: ShowcaseVideo[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function SkillShowcaseViewer({ videos, initialIndex = 0, open, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset state when opening/changing videos
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setIsPlaying(true);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [open, initialIndex]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentIndex, isPlaying]);

  if (!open || videos.length === 0) return null;

  const currentVideo = videos[currentIndex];

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose(); // Close if at the end
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-[60] p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Carousel Container */}
        <div 
          className="relative w-full max-w-[400px] h-[85vh] bg-black rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentVideo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="relative w-full h-full flex flex-col justify-center bg-zinc-900"
            >
              {/* Video Element */}
              <video
                ref={videoRef}
                src={currentVideo.url}
                className="w-full h-full object-cover"
                loop
                muted={isMuted}
                playsInline
                onClick={togglePlay}
                onEnded={handleNext}
              />

              {/* Overlay Gradient for readability */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

              {/* Controls Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
                {/* Top header */}
                <div className="flex justify-between items-start pointer-events-auto">
                  <Badge variant="default" className="bg-primary text-primary-foreground border-none font-semibold shadow-lg backdrop-blur-md bg-opacity-90">
                    {currentVideo.skillName}
                  </Badge>
                  <button 
                    onClick={toggleMute}
                    className="p-2.5 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>

                {/* Bottom info */}
                <div className="space-y-3 pointer-events-auto w-[85%]">
                  {currentVideo.subtitle ? (
                    <p className="text-white text-lg font-medium drop-shadow-md leading-tight">
                      {currentVideo.subtitle}
                    </p>
                  ) : (
                    <p className="text-white/80 text-sm font-medium drop-shadow-md">
                      Proof of Skill
                    </p>
                  )}
                </div>
              </div>

              {/* Center Play/Pause indicator */}
              <AnimatePresence>
                {!isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="p-4 bg-black/40 rounded-full backdrop-blur-md">
                      <Play className="w-12 h-12 text-white ml-1" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          {currentIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {currentIndex < videos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Progress indicators */}
          {videos.length > 1 && (
            <div className="absolute top-3 inset-x-0 flex justify-center gap-1.5 px-6">
              {videos.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 rounded-full flex-1 transition-colors duration-300 ${idx === currentIndex ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
