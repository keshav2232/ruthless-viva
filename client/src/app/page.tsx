'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startViva } from '../utils/api';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<'subject' | 'syllabus'>('subject'); // Toggle Mode
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    studentName: '',
    subject: '',
    difficulty: 'Normal',
    syllabusText: ''
  });

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
        file
      );
      router.push(`/viva/${data.sessionId}?initialQuestion=${encodeURIComponent(data.question)}`);
    } catch (error) {
      console.error('Failed to start', error);
      alert('Failed to start viva. Check backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 text-center">

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
                  <option value="Normal">Normal</option>
                  <option value="Torment">Torment</option>
                  <option value="Ruthless">Ruthless</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
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
      </div>

      <div className="mt-12 text-xs text-[#5c544e] font-sans">
        Powered by Gemini AI & ElevenLabs <br />
        Built for serious viva preparation
      </div>
    </main>
  );
}
