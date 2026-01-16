const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/viva';

export async function startViva(
    subject: string,
    difficulty: string,
    studentName: string,
    syllabusText?: string,
    syllabusFile?: File | null
) {
    let body: any;
    let headers: any = {};

    if (syllabusFile) {
        const formData = new FormData();
        formData.append('subject', subject);
        formData.append('difficulty', difficulty);
        formData.append('studentName', studentName);
        if (syllabusText) formData.append('syllabusText', syllabusText);
        formData.append('syllabus', syllabusFile);

        body = formData;
        // Content-Type header is automatically set by browser with FormData
    } else {
        body = JSON.stringify({ subject, difficulty, studentName, syllabusText });
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers,
        body
    });
    return res.json();
}

export async function respondToViva(sessionId: string, answerText: string, audioConfidence: number = 1.0) {
    const res = await fetch(`${API_BASE}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, answerText, audioConfidence })
    });
    return res.json();
}

export async function getReport(sessionId: string) {
    const res = await fetch(`${API_BASE}/session/${sessionId}`);
    return res.json();
}
