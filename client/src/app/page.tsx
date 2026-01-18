'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { startViva } from '../utils/api';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // New interactive states
  const [isLanding, setIsLanding] = useState(true);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const requestRef = useRef<number | null>(null);

  const [mode, setMode] = useState<'subject' | 'syllabus'>('subject'); // Toggle Mode
  const [file, setFile] = useState<File | null>(null);

  const [includeIntro, setIncludeIntro] = useState(true);

  const [formData, setFormData] = useState({
    studentName: '',
    subject: '',
    difficulty: 'Normal',
    syllabusText: ''
  });

  // Hold Animation Logic
  useEffect(() => {
    if (isHolding) {
      const animate = () => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            setIsLanding(false); // Trigger transition
            setIsHolding(false);
            return 100;
          }
          return prev + 2; // Speed of fill
        });
        requestRef.current = requestAnimationFrame(animate);
      };
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setHoldProgress(0);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isHolding]);

  const startHold = () => setIsHolding(true);
  const endHold = () => setIsHolding(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If in syllabus mode, subject is optional/derived
      const subjectToUse = mode === 'subject' ? formData.subject : (file ? file.name : 'Custom Syllabus');

      const data = await startViva(
        subjectToUse,
        formData.difficulty,
        formData.studentName,
        formData.syllabusText,
        file,
        includeIntro
      );
      router.push(`/viva/${data.sessionId}?initialQuestion=${encodeURIComponent(data.question)}`);
    } catch (error: any) {
      console.error('Failed to start', error);
      alert(`Failed to start viva: ${error.message || 'Unknown error'}. Check console/network tab.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative overflow-hidden bg-[#0d0b0a] select-none"
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu on hold
    >

      {/* Background Noise/Grain Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-10"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* Floating Particles (CSS Only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#e5e0d8] opacity-[0.05]"
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s infinite linear`
            }}
          />
        ))}
        <style jsx>{`
          @keyframes float {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            50% { opacity: 0.1; }
            100% { transform: translateY(-100px) translateX(50px); opacity: 0; }
          }
        `}</style>
      </div>

      {/* LANDING STATE (HERO) */}
      <div className={`transition-all duration-1000 ease-in-out absolute inset-0 flex flex-col items-center justify-center z-20 
          ${isLanding ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>

        <h1 className="text-6xl md:text-9xl text-[#e5e0d8] font-serif tracking-[0.2em] mb-12 glow-text animate-[fadeIn_1s_ease-out]">
          VIVA
        </h1>

        {/* HOLD INTERACTION BUTTON */}
        <div
          className="relative w-32 h-32 flex items-center justify-center cursor-pointer group"
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
        >
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
            <circle
              cx="64" cy="64" r="60"
              stroke="#3e342f" strokeWidth="2" fill="transparent"
            />
            <circle
              cx="64" cy="64" r="60"
              stroke="#582f29" strokeWidth="4" fill="transparent"
              strokeDasharray="377"
              strokeDashoffset={377 - (377 * holdProgress) / 100}
              strokeLinecap="round"
              className="transition-all duration-75 ease-linear"
            />
          </svg>

          {/* Inner Icon */}
          <div className={`w-24 h-24 rounded-full bg-[#1a1614] flex items-center justify-center border border-[#3e342f] transition-all duration-300 ${isHolding ? 'scale-95 border-[#582f29]' : 'group-hover:scale-105'}`}>
            <div className={`w-12 h-12 text-[#e5e0d8] transition-opacity duration-300 ${isHolding ? 'opacity-100' : 'opacity-50'}`}>
              {/* Fingerprint / Power Icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v10" />
                <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
              </svg>
            </div>
          </div>

          {/* Pulse Effect */}
          {!isHolding && <div className="absolute inset-0 rounded-full border border-[#582f29]/30 animate-ping pointer-events-none"></div>}
        </div>

        <p className="text-[#a89f91] text-sm tracking-[0.3em] uppercase mt-8 animate-pulse">
          {isHolding ? 'Initializing...' : 'Hold to Enter'}
        </p>

      </div>

      {/* FORM STATE (Configuration) */}
      <div className={`transition-all duration-1000 ease-in-out w-full flex flex-col items-center z-30
          ${!isLanding ? 'opacity-100 translate-y-0 delay-500' : 'opacity-0 translate-y-10 pointer-events-none'}`}>

        {/* Header Section */}
        <div className="mb-12 space-y-4">
          <h1 className="text-5xl md:text-6xl text-[#e5e0d8] opacity-90 tracking-wide glow-text">
            Ruthless Viva Simulator
          </h1>
          <div className="h-px w-24 bg-[#582f29] mx-auto opacity-50 my-4"></div>
          <p className="text-[#a89f91] text-lg max-w-lg mx-auto font-serif italic">
            An AI examiner that evaluates <br /> clarity, confidence, and correctness.
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-panel p-8 w-full max-w-lg shadow-2xl relative">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-left">

            <div>
              <label className="block text-sm font-medium text-[#8c7b70] mb-2 uppercase tracking-wide text-xs">Student Name</label>
              <input
                type="text"
                required
                className="w-full vintage-input rounded-md p-3 text-lg"
                placeholder="e.g. John Doe"
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
              />
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-4 border-b border-[#3e342f] pb-4">
              <button
                type="button"
                onClick={() => setMode('subject')}
                className={`flex-1 py-2 text-sm uppercase tracking-wider font-bold transition-colors ${mode === 'subject' ? 'text-[#e5e0d8] border-b-2 border-[#582f29]' : 'text-[#5c544e]'}`}
              >
                Standard Subject
              </button>
              <button
                type="button"
                onClick={() => setMode('syllabus')}
                className={`flex-1 py-2 text-sm uppercase tracking-wider font-bold transition-colors ${mode === 'syllabus' ? 'text-[#e5e0d8] border-b-2 border-[#582f29]' : 'text-[#5c544e]'}`}
              >
                Upload Syllabus
              </button>
            </div>

            {mode === 'subject' ? (
              <div>
                <label className="block text-sm font-medium text-[#8c7b70] mb-2 uppercase tracking-wide text-xs">Subject</label>
                <input
                  type="text"
                  required={mode === 'subject'}
                  className="w-full vintage-input rounded-md p-3 text-lg"
                  placeholder="e.g. Operating Systems"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#8c7b70] mb-2 uppercase tracking-wide text-xs">Paste Notes / Context</label>
                  <textarea
                    className="w-full vintage-input rounded-md p-3 text-sm h-24"
                    placeholder="Paste your chapter content here..."
                    value={formData.syllabusText}
                    onChange={(e) => setFormData({ ...formData, syllabusText: e.target.value })}
                  />
                </div>
                <div className="text-center text-[#5c544e] text-xs uppercase tracking-widest">- OR -</div>
                <div>
                  <label className="block text-sm font-medium text-[#8c7b70] mb-2 uppercase tracking-wide text-xs">Upload PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-sm text-[#a89f91] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#582f29] file:text-[#e5e0d8] hover:file:bg-[#6b3a32] cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#8c7b70] mb-2 uppercase tracking-wide text-xs">Difficulty</label>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <select
                    className="w-full vintage-input rounded-md p-3 text-lg appearance-none cursor-pointer"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Normal">Normal</option>
                    <option value="Torment">Torment</option>
                    <option value="Ruthless">Ruthless</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="introCheck"
                    className="w-5 h-5 accent-[#582f29] cursor-pointer"
                    checked={includeIntro}
                    onChange={(e) => setIncludeIntro(e.target.checked)}
                  />
                  <label htmlFor="introCheck" className="text-xs uppercase tracking-wide text-[#8c7b70] cursor-pointer select-none">
                    Include<br />Intro
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || (mode === 'syllabus' && !formData.syllabusText && !file)}
                  className="flex-[2] vintage-btn text-[#e5e0d8] font-bold py-3 rounded-md uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Preparing...' : 'Begin Viva'}
                </button>
              </div>
            </div>


            {/* Divider */}
            <div className="border-t border-[#3e342f] my-2"></div>

            {/* Footer Info */}
            <div className="text-center">
              <h3 className="text-[#8c7b70] font-serif text-lg mb-4 italic">What this evaluates</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-[#a89f91] text-left max-w-xs mx-auto">
                <div className="flex items-center gap-2"><div className="w-1 h-1 bg-[#582f29] rounded-full"></div> Conceptual accuracy</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 bg-[#582f29] rounded-full"></div> Filler words & hesitation</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 bg-[#582f29] rounded-full"></div> Confidence & pauses</div>
                <div className="flex items-center gap-2"><div className="w-1 h-1 bg-[#582f29] rounded-full"></div> Depth of understanding</div>
              </div>
            </div>

          </form>
        </div >

        <div className="mt-12 text-xs text-[#5c544e] font-sans">
          Powered by Gemini AI & ElevenLabs <br />
          Built for serious viva preparation
          <br />
          <span className="opacity-50 mt-2 block">
            Backend: {process.env.NEXT_PUBLIC_API_URL || 'Using Localhost (Default)'}
          </span>
        </div>
      </div>
    </main>
  );
}
