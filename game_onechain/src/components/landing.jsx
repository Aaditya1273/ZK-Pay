'use client';
import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

const Hero = ({ onPlayClick }) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#050505]">
      {/* Cinematic Background with Parallax effect */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110 blur-[2px]"
          style={{ 
            backgroundImage: "url('/assets/images/world/background02.png')",
            filter: "brightness(0.4) contrast(1.2)"
          }}
        ></div>
        {/* Dynamic Fog Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/80"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] opacity-60"></div>
      </div>

      {/* Floating Particles or Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Content Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center"
      >
        <div className="mb-4 inline-block px-4 py-1 rounded-full border border-teal-500/30 bg-teal-500/5 backdrop-blur-md">
          <span className="text-[10px] uppercase tracking-[0.5em] text-teal-400 font-bold">
            0G Galileo Testnet Active
          </span>
        </div>

        <h1 className="text-7xl md:text-9xl font-black text-white font-cinzel tracking-tighter mb-6 leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
          BEYOND <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-teal-200 to-white/80">THE FOG</span>
        </h1>
        
        <p className="max-w-xl text-lg md:text-xl text-gray-400 font-light tracking-[0.1em] mb-12 font-merriweather italic leading-relaxed">
          "The whispers in the mist hold the keys to your survival. Uncover the truth, or be lost to the silence forever."
        </p>
        
        <div className="flex flex-col items-center gap-8">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  className={`transition-all duration-700 ${!ready ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openConnectModal();
                          }}
                          className="group relative px-14 py-5 bg-teal-500 text-teal-950 font-black rounded-full overflow-hidden transition-all duration-500 hover:scale-105 hover:bg-teal-400 shadow-[0_0_40px_rgba(45,212,191,0.3)] hover:shadow-[0_0_60px_rgba(45,212,191,0.5)] active:scale-95"
                        >
                          <span className="relative z-10 uppercase tracking-[0.2em] text-sm">Initialize Identity</span>
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-expo"></div>
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="px-14 py-5 bg-red-600/20 border border-red-500 text-red-500 font-bold rounded-full backdrop-blur-xl transition-all duration-300 hover:bg-red-600 hover:text-white shadow-[0_0_40px_rgba(220,38,38,0.2)] uppercase tracking-[0.2em] text-sm"
                        >
                          Protocol Mismatch
                        </button>
                      );
                    }

                    return (
                      <div className="flex flex-col items-center gap-6">
                        <button
                          onClick={onPlayClick}
                          className="group relative px-20 py-6 bg-white text-black font-black rounded-full overflow-hidden transition-all duration-700 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_70px_rgba(255,255,255,0.4)] active:scale-95"
                        >
                          <span className="relative z-10 uppercase tracking-[0.3em] text-base">Enter Village</span>
                          <div className="absolute inset-0 bg-teal-400 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-in-out"></div>
                        </button>
                        
                        <div 
                          onClick={openAccountModal}
                          className="cursor-pointer px-4 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all flex items-center gap-3"
                        >
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                          <span className="text-[10px] text-gray-400 font-mono tracking-widest">{account.displayName}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <div className="absolute bottom-12 z-10 flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-500">
        <div className="flex items-center gap-6">
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-teal-500/50"></div>
          <span className="text-[10px] uppercase tracking-[0.5em] text-teal-400/80 font-medium">Decentralized Horror Engine</span>
          <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-teal-500/50"></div>
        </div>
        <div className="text-[9px] text-gray-500 tracking-[0.2em]">POWERED BY 0G STORAGE & EVM ARCHITECTURE</div>
      </div>

      {/* Side Vignettes */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#050505] to-transparent z-10"></div>
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#050505] to-transparent z-10"></div>
    </div>
  );
};

export default Hero;