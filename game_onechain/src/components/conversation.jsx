'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Props:
 * - dialogues: Array<{ speaker: string, text: string, portrait?: string }>
 * - onComplete: () => void
 */
export default function Conversation({ dialogues = [], onComplete }) {
  const [index, setIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const typingRef = useRef(null);
  const utterRef = useRef(null);
  const advanceTimeoutRef = useRef(null);
  const currentIndexRef = useRef(index);

  useEffect(() => {
    currentIndexRef.current = index;
  }, [index]);

  const cleanup = useCallback(() => {
    if (typingRef.current) clearInterval(typingRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    if (utterRef.current) utterRef.current.onend = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        if (dontShowAgain && typeof window !== 'undefined') {
          localStorage.setItem('skipStoryIntro', 'true');
        }
        if (onComplete) onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onComplete, dontShowAgain]);

  const advance = useCallback(() => {
    cleanup();
    if (index + 1 >= dialogues.length) {
      setIsExiting(true);
    } else {
      setIndex((prevIndex) => prevIndex + 1);
    }
  }, [index, dialogues.length, cleanup]);

  useEffect(() => {
    if (isExiting) return;
    cleanup();

    const line = dialogues[index];
    if (!line) return;

    let pos = 0;
    setDisplayText('');
    typingRef.current = setInterval(() => {
      pos++;
      setDisplayText(line.text.slice(0, pos));
      if (pos >= line.text.length) {
        clearInterval(typingRef.current);
      }
    }, 40); // Faster, snappier typing

    const handleSpeechSuccess = () => {
      if (currentIndexRef.current === index) {
        advanceTimeoutRef.current = setTimeout(() => {
          advance();
        }, 1200);
      }
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && line.text) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(line.text);
      utter.lang = 'en-US';
      utter.volume = 0.6;
      utter.rate = 1.0;
      utter.onend = handleSpeechSuccess;
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    } else {
      const estimatedTime = Math.max(4000, line.text.length * 60);
      advanceTimeoutRef.current = setTimeout(() => {
        advance();
      }, estimatedTime);
    }

    return cleanup;
  }, [index, dialogues, cleanup, advance, isExiting]);

  const skip = () => {
    cleanup();
    setIsExiting(true);
  };

  const currentLine = dialogues[index];
  if (!currentLine) return null;

  const speakers = [...new Set(dialogues.map(d => d.speaker))];
  const leftSpeakerName = speakers[0];
  const isLeftSpeakerActive = currentLine.speaker === leftSpeakerName;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center px-6 pb-12 overflow-hidden">
      {/* Background Dim with progressive blur */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md z-0"
      />

      {/* Atmospheric Glows */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent z-0"></div>
      
      {/* Portraits */}
      <div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto h-full flex justify-between items-end pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ 
            opacity: isLeftSpeakerActive ? 1 : 0.3, 
            x: 0,
            scale: isLeftSpeakerActive ? 1.05 : 0.95,
            filter: isLeftSpeakerActive ? 'grayscale(0%)' : 'grayscale(100%)'
          }}
          transition={{ duration: 0.8 }}
          className="h-[60vh] flex items-end"
        >
          <img
            src="/assets/images/characters/villager03.png"
            alt={leftSpeakerName}
            className="h-full object-contain drop-shadow-[0_0_50px_rgba(45,212,191,0.2)]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ 
            opacity: !isLeftSpeakerActive ? 1 : 0.3, 
            x: 0,
            scale: !isLeftSpeakerActive ? 1.05 : 0.95,
            filter: !isLeftSpeakerActive ? 'grayscale(0%)' : 'grayscale(100%)'
          }}
          transition={{ duration: 0.8 }}
          className="h-[60vh] flex items-end"
        >
          <img
            src="/assets/images/characters/villager04.png"
            alt="Companion"
            className="h-full object-contain drop-shadow-[0_0_50px_rgba(255,255,255,0.1)]"
          />
        </motion.div>
      </div>

      {/* Dialogue Interface */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-20 w-full max-w-5xl"
      >
        <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden group">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent"></div>
          
          {/* Speaker Tag */}
          <div className="absolute -top-4 left-10">
            <div className={`px-8 py-2 rounded-xl border border-white/10 backdrop-blur-2xl shadow-2xl transition-all duration-500 ${
              isLeftSpeakerActive ? 'bg-teal-500 text-black' : 'bg-white/10 text-white'
            }`}>
              <span className="text-xs font-black uppercase tracking-[0.4em]">{currentLine.speaker}</span>
            </div>
          </div>

          {/* Text area */}
          <div className="min-h-[140px] flex items-center">
            <p className="text-2xl md:text-4xl text-white/90 font-cinzel leading-snug tracking-tight drop-shadow-sm">
              {displayText}
              <motion.span 
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="ml-2 text-teal-400"
              >
                _
              </motion.span>
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="absolute bottom-0 left-0 h-1 bg-teal-500/20 w-full">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((index + 1) / dialogues.length) * 100}%` }}
              className="h-full bg-teal-500 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-8 gap-6">
          <button
            onClick={() => setDontShowAgain(!dontShowAgain)}
            className="flex items-center gap-4 text-white/40 hover:text-white/80 transition-all group"
          >
            <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
              dontShowAgain ? 'bg-teal-500 border-teal-500' : 'border-white/20'
            }`}>
              {dontShowAgain && (
                <svg className="w-3 h-3 text-black font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Skip intro next time</span>
          </button>

          <div className="flex items-center gap-8">
            <button
              onClick={skip}
              className="text-[10px] uppercase tracking-[0.4em] text-white/30 hover:text-white transition-colors"
            >
              Skip Story
            </button>
            <button
              onClick={advance}
              className="group relative px-12 py-4 bg-white text-black font-black rounded-full overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl"
            >
              <span className="relative z-10 uppercase tracking-[0.2em] text-xs">
                {index + 1 >= dialogues.length ? "Begin Journey" : "Next"}
              </span>
              <div className="absolute inset-0 bg-teal-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

