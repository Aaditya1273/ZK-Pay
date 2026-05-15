'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';

const PhaserGame = dynamic(() => import('../components/phaserGame'), { ssr: false });
import Hero from '../components/landing';
import Conversation from '../components/conversation';

const STORY_DIALOGUES = [
  { speaker: "Narrator", text: "A storm... a sudden crash... then darkness. You wake up alone in this strange, misty village." },
  { speaker: "Narrator", text: "Your friends are missing, but the villagers whisper that others arrived in the night." },
  { speaker: "Elder", text: "Welcome. To find your lost companions, you must earn our trust." },
  { speaker: "Elder", text: "Some will help you properly, others are greedy. Talk to everyone, collect hints, and hurry..." },
];

export default function Home() {
  const [isGameVisible, setGameVisible] = useState(false);
  const [showStory, setShowStory] = useState(false);

  const enterFullScreen = () => {
    const docEl = document.documentElement;
    if (typeof window !== 'undefined' && docEl.requestFullscreen) {
      docEl.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  const handlePlayGame = () => {
    enterFullScreen();
    const shouldSkip = localStorage.getItem('skipStoryIntro') === 'true';
    if (shouldSkip) {
      setGameVisible(true);
    } else {
      setShowStory(true);
    }
  };

  const handleStoryComplete = () => {
    setShowStory(false);
    setGameVisible(true);
  };

  return (
    <main className="bg-black min-h-screen relative overflow-hidden">
      <AnimatePresence mode="wait">
        {isGameVisible ? (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-screen"
          >
            <PhaserGame />
          </motion.div>
        ) : showStory ? (
          <motion.div 
            key="story"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-screen relative"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40 grayscale"
              style={{ filter: 'blur(8px)' }}
            >
              <source src="/assets/cut-scene/landing_bg_video.mp4" type="video/mp4" />
            </video>
            <Conversation
              dialogues={STORY_DIALOGUES}
              onComplete={handleStoryComplete}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full min-h-screen"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute top-0 left-0 w-full h-full object-cover z-0"
              style={{ filter: 'brightness(0.3) contrast(1.1)' }}
            >
              <source src="/assets/cut-scene/landing_bg_video.mp4" type="video/mp4" />
            </video>
            <div className="relative z-10">
              <Hero onPlayClick={handlePlayGame} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}