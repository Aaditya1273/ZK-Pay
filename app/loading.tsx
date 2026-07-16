import { Sparkles } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f0f0f4] absolute inset-0 z-[100] rounded-[16px]">
      <div className="flex flex-col items-center gap-6">
        {/* Premium glowing pulsing avatar */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 bg-[#8a75ff]/20 rounded-full animate-ping [animation-duration:2s]" />
          <div className="absolute inset-2 bg-[#5b3eff]/20 rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-[0_0_20px_rgba(91,62,255,0.15)] border border-[#e5e0ff]">
            <Sparkles className="w-6 h-6 text-[#5b3eff]" />
          </div>
        </div>
        
        {/* Clean minimal text */}
        <div className="flex flex-col items-center gap-1.5">
          <h3 className="text-gray-900 font-semibold tracking-tight">Initializing SHIPIT</h3>
          <p className="text-sm font-medium text-gray-400 animate-pulse">Warming up the engines...</p>
        </div>
      </div>
    </div>
  )
}
