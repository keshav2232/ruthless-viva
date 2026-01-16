'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { respondToViva } from '@/utils/api';

// Types for Speech Recognition
declare global {
    interface Window {
        webkitSpeechRecognition: any;
    }
}

export default function VivaSession() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuestion = searchParams.get('initialQuestion');
    const sessionId = params.id as string;

    const [history, setHistory] = useState<{ role: string, text: string }[]>([]);
    const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'>('IDLE');
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState('');
    const [liveStats, setLiveStats] = useState({ confidence: 100, fillerCount: 0 });

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const confidenceRef = useRef<number>(1.0); // Default to 1.0 (100%)

    useEffect(() => {
        // Initialize Speech Recognition
        if (typeof window !== 'undefined' && window.webkitSpeechRecognition) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true; // KEEP LISTENING even if user pauses
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                let totalConfidence = 0;
                let resultCount = 0;

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                        totalConfidence += event.results[i][0].confidence;
                        resultCount++;
                    }
                }

                const currentTranscript = Array.from(event.results)
                    .map((result: any) => result[0].transcript)
                    .join(''); // Use join('') to get the full running text, or handle appropriately

                // --- Live Analysis ---
                // 1. Calculate Confidence (Simple moving average for now, or just current chunk)
                // Note: Web Speech API confidence is 0.0-1.0. We want 0-100.
                let currentConfidence = 100;
                if (resultCount > 0) {
                    // If we have final results, use them
                    currentConfidence = Math.round((totalConfidence / resultCount) * 100);
                    // Update ref for final submission
                    confidenceRef.current = totalConfidence / resultCount;
                } else if (event.results.length > 0) {
                    // Use interim confidence (often not provided by all browsers, but safe to check)
                    const lastResult = event.results[event.results.length - 1];
                    if (lastResult && lastResult[0] && lastResult[0].confidence) {
                        currentConfidence = Math.round(lastResult[0].confidence * 100);
                    }
                }

                // 2. Count Fillers
                // Simple regex for common fillers.
                const fillerRegex = /\b(um|uh|like|you know|i mean|sort of)\b/gi;
                const matches = currentTranscript.match(fillerRegex);
                const currentFillerCount = matches ? matches.length : 0;

                setLiveStats({
                    confidence: currentConfidence > 0 ? currentConfidence : 100, // Default to 100 if 0 (start)
                    fillerCount: currentFillerCount
                });

                setTranscript(currentTranscript);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    alert("Microphone access blocked. Please allow permissions.");
                }
            };

            recognitionRef.current = recognition;
        }

        // Initialize Initial Question
        if (initialQuestion && history.length === 0) {
            setHistory([{ role: 'examiner', text: initialQuestion }]);
        }
    }, [initialQuestion]);

    const startListening = () => {
        setTranscript('');
        setLiveStats({ confidence: 100, fillerCount: 0 }); // Reset stats
        setStatus('LISTENING');
        try {
            recognitionRef.current?.start();
        } catch (e) {
            console.error("Mic start error", e);
        }
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
        if (transcript.trim().length > 0) {
            handleSubmitAnswer(transcript);
        } else {
            // If stopped without text, maybe end session? or just go idle.
            // Let's add an explicit "End Exam" button instead or handle it here?
            setStatus('IDLE');
        }
    };

    const endExam = () => {
        // Stop any ongoing activity
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        window.speechSynthesis.cancel(); // Stop browser TTS if running

        // Redirect to report
        router.push(`/report/${sessionId}`);
    };

    const handleSubmitAnswer = async (answerText: string) => {
        setStatus('PROCESSING');

        // Add to history temporarily
        setHistory(prev => [...prev, { role: 'student', text: answerText }]);

        try {
            const response = await respondToViva(sessionId, answerText, confidenceRef.current);

            if (response.error) {
                alert(`Error: ${response.error}. Please restart the exam.`);
                setHistory(prev => [...prev, { role: 'system', text: `Error: ${response.error}` }]);
                setStatus('IDLE');
                return;
            }

            // Update history with Examiner response
            setHistory(prev => [
                ...prev,
                { role: 'examiner', text: response.reaction + " " + response.nextQuestion }
            ]);

            if (response.analysis) {
                setFeedback(`Confidence: ${response.analysis.confidence}% | Fillers: ${response.analysis.fillers.count}`);
            }

            // Play Audio or Fallback to Browser TTS
            if (response.audioUrl) {
                setStatus('SPEAKING');
                const audio = new Audio(response.audioUrl);
                audio.onended = () => setStatus('IDLE');
                audio.play();
                audioRef.current = audio;
            } else {
                // Fallback: Browser Speech Synthesis
                console.log("Using Browser TTS Fallback");
                setStatus('SPEAKING');
                const utterance = new SpeechSynthesisUtterance(response.reaction + " " + response.nextQuestion);
                // Try to find a strict voice
                const voices = window.speechSynthesis.getVoices();
                const strictVoice = voices.find(v => v.name.includes('Google UK English Male')) || voices[0];
                if (strictVoice) utterance.voice = strictVoice;

                utterance.rate = 1.1; // Slightly faster
                utterance.pitch = 0.9; // Lower pitch

                utterance.onend = () => setStatus('IDLE');
                window.speechSynthesis.speak(utterance);
            }

        } catch (e) {
            console.error(e);
            setStatus('IDLE');
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center p-4">

            {/* Visualizer / Avatar */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
                <div className={`relative w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl
            ${status === 'SPEAKING' ? 'border-[#582f29] scale-110 examiner-pulse' : 'border-[#3e342f]'}
            ${status === 'PROCESSING' ? 'animate-spin border-t-[#582f29]' : ''}
        `}>
                    <div className="text-5xl opacity-80 filter sepia">
                        {status === 'SPEAKING' ? '🗣️' : status === 'LISTENING' ? '👂' : '👨‍🏫'}
                    </div>
                </div>

                <p className="mt-8 text-xl text-center text-[#a89f91] font-serif italic min-h-[3rem]">
                    {status === 'SPEAKING' ? 'The Examiner is speaking...' :
                        status === 'LISTENING' ? 'Listening to your response...' :
                            status === 'PROCESSING' ? 'Analyzing your competence...' : 'Waiting for you...'}
                </p>

                {/* Feedback Display */}
                {feedback && (
                    <div className="mt-4 text-sm font-mono text-[#e5e0d8] bg-[#582f29]/40 border border-[#582f29] px-4 py-2 rounded">
                        {feedback}
                    </div>
                )}
            </div>

            {/* Transcript Area */}
            <div className="w-full max-w-2xl flex flex-col gap-4 mb-8">

                {/* Live Stats HUD */}
                {status === 'LISTENING' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-panel p-3 flex flex-col items-center justify-center border-t-2 border-t-[#582f29]">
                            <span className="text-xs uppercase tracking-widest text-[#8c7b70] mb-1">Confidence</span>
                            <span className={`text-2xl font-serif font-bold ${liveStats.confidence > 80 ? 'text-green-400' :
                                liveStats.confidence > 50 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                {liveStats.confidence}%
                            </span>
                        </div>
                        <div className="glass-panel p-3 flex flex-col items-center justify-center border-t-2 border-t-[#582f29]">
                            <span className="text-xs uppercase tracking-widest text-[#8c7b70] mb-1">Filler Words</span>
                            <span className={`text-2xl font-serif font-bold ${liveStats.fillerCount === 0 ? 'text-[#e5e0d8]' :
                                liveStats.fillerCount < 3 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                {liveStats.fillerCount}
                            </span>
                        </div>
                    </div>
                )}

                <div className="w-full min-h-[150px] p-6 glass-panel overflow-y-auto max-h-[300px] flex flex-col-reverse">
                    <div className="space-y-4">
                        {history.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-4 rounded-lg max-w-[85%] border shadow-md ${msg.role === 'student'
                                    ? 'bg-[#2c2420] border-[#3e342f] text-[#e5e0d8]'
                                    : 'bg-[#1a1614] border-[#582f29]/50 text-[#d4ccc2]'
                                    }`}>
                                    <p className="text-xs opacity-50 mb-1 uppercase tracking-widest font-serif text-[#8c7b70]">{msg.role}</p>
                                    <p className="leading-relaxed font-serif">{msg.text}</p>
                                </div>
                            </div>
                        ))}

                        {status === 'LISTENING' && (
                            <div className="flex justify-end">
                                <div className="p-4 rounded-lg bg-[#2c2420]/50 border border-[#3e342f] animate-pulse text-[#8c7b70] italic font-serif">
                                    {transcript || "Listening..."}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="mb-12 w-full max-w-md flex flex-col items-center">
                {status === 'IDLE' && (
                    <button
                        onClick={startListening}
                        className="vintage-btn w-full text-[#e5e0d8] font-bold py-4 px-12 rounded-lg uppercase tracking-widest transition-transform hover:scale-105"
                    >
                        Tap to Speak
                    </button>
                )}

                {status === 'LISTENING' && (
                    <button
                        onClick={stopListening}
                        className="w-full bg-[#1a1614] border border-[#3e342f] hover:bg-[#2c2420] text-[#a89f91] font-bold py-4 px-12 rounded-lg transition-colors uppercase tracking-widest"
                    >
                        Done Speaking
                    </button>
                )}

                {/* Always Show End Exam if history exists */}
                {history.length > 0 && (
                    <button
                        onClick={endExam}
                        className="block mt-6 text-[#8c7b70] hover:text-red-400 underline text-sm transition-colors font-serif italic"
                    >
                        {status === 'SPEAKING' ? 'STOP & END EXAM' : 'Concede / End Exam'}
                    </button>
                )}
            </div>

        </main>
    );
}
