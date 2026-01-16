'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getReport } from '@/utils/api';

export default function ReportPage() {
    const params = useParams();
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (params.id) {
            getReport(params.id as string).then(setData);
        }
    }, [params.id]);

    if (!data) return <div className="min-h-screen flex items-center justify-center text-[#e5e0d8] font-serif">Loading Report...</div>;

    if (data.error || !data.history) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-[#e5e0d8] font-serif p-8 text-center">
                <h1 className="text-4xl mb-4 text-[#bf5b4b]">Report Not Found</h1>
                <p className="text-[#a89f91] mb-8">{data.error || "Session validation failed."}</p>
                <a href="/" className="vintage-btn text-[#e5e0d8] font-bold py-3 px-8 rounded-lg uppercase tracking-widest">
                    Return Home
                </a>
            </div>
        );
    }

    return (
        <main className="min-h-screen p-8 text-[#e5e0d8]">
            <div className="max-w-4xl mx-auto space-y-12">

                {/* Header */}
                <div className="border-b border-[#582f29] pb-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-wide mb-4 text-[#e5e0d8] glow-text font-serif">
                        Final Viva Report
                    </h1>
                    <div className="flex justify-center gap-12 text-[#a89f91] font-serif italic text-lg">
                        <p>Subject: <span className="text-[#e5e0d8] not-italic">{data.subject}</span></p>
                        <p>Difficulty: <span className="text-[#e5e0d8] not-italic">{data.difficulty}</span></p>
                    </div>
                </div>

                {/* Score Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-8 text-center flex flex-col justify-center">
                        <h3 className="text-[#8c7b70] uppercase text-xs tracking-[0.2em] mb-4">Confidence</h3>
                        <p className="text-6xl font-serif text-[#d4ccc2]">{data.avgConfidence}%</p>
                        <p className="text-xs text-[#8c7b70] mt-4 font-serif italic">Average poise & tone</p>
                    </div>

                    <div className="glass-panel p-8 text-center border border-[#582f29] relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute top-0 w-full h-1 bg-[#582f29] left-0 opacity-50"></div>
                        <h3 className="text-[#8c7b70] uppercase text-xs tracking-[0.2em] mb-4">Examiner Score</h3>
                        <p className="text-6xl font-serif text-[#bf5b4b]">{data.avgScore}/10</p>
                        <p className="text-xs text-[#8c7b70] mt-4 font-serif italic">Content correctness & depth</p>
                    </div>

                    <div className="glass-panel p-8 text-center flex flex-col justify-center">
                        <h3 className="text-[#8c7b70] uppercase text-xs tracking-[0.2em] mb-4">Duration</h3>
                        <p className="text-6xl font-serif text-[#a89f91]">{data.history.length / 2}</p>
                        <p className="text-xs text-[#8c7b70] mt-4 font-serif italic">Questions endured</p>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="glass-panel p-8 md:p-12">
                    <h2 className="text-3xl font-serif mb-8 text-[#e5e0d8] border-b border-[#3e342f] pb-4">Detailed Transcript</h2>
                    <div className="space-y-8">
                        {data.history.map((msg: any, i: number) => (
                            <div key={i} className={`relative pl-8 ${msg.role === 'examiner' ? 'border-l-2 border-[#582f29]' : 'border-l-2 border-[#3e342f]'}`}>
                                <p className="text-xs uppercase tracking-widest text-[#8c7b70] mb-2 font-serif">
                                    {msg.role} {msg.confidence ? `(Confidence: ${msg.confidence}%)` : ''}
                                </p>
                                <p className="text-lg leading-relaxed font-serif text-[#d4ccc2]">{msg.text}</p>
                                {msg.role === 'student' && i < data.scores.length * 2 && (
                                    <div className="mt-3 text-xs font-mono text-[#bf5b4b]">
                                        Examiner's Grade: {data.scores[Math.floor(i / 2)]} / 10
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center pt-8 pb-16">
                    <a href="/" className="vintage-btn text-[#e5e0d8] font-bold py-4 px-12 rounded-lg uppercase tracking-widest transition-transform hover:scale-105 inline-block">
                        Take Another Exam
                    </a>
                </div>

            </div>
        </main>
    );
}
