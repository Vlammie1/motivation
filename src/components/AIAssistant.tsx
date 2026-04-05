import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, AlertTriangle, Check, Edit, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateGeminiContent, respondToToolCall } from '../lib/gemini';
import type { DailyHabit, OtherActivity } from '../types/work';
import type { WorkLogEntry } from '../hooks/useSupabaseWorkLogs';
import type { Project } from '../hooks/useSupabaseProjects';

interface AIAssistantProps {
    data: {
        workHours: Record<string, number>;
        dailyHabits: Record<string, DailyHabit>;
        workLogEntries: WorkLogEntry[];
        otherActivities: OtherActivity[];
        projects: Project[];
    };
    onAddWorkLog: (date: string, hours: number, note?: string, projectId?: string) => Promise<any>;
    onUpsertHabit: (date: string, wake: string | null, sleep: string | null) => Promise<any>;
}

interface Message {
    role: 'user' | 'ai';
    content: string;
    actionProposal?: {
        toolName: string;
        args: any;
        id: string;
    };
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ data, onAddWorkLog, onUpsertHabit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: 'Hoi! Ik ben OBSERVER v3.1 Preview. Wat kan ik voor je opzoeken of vastleggen vandaag? ✨' }
    ]);
    const messagesRef = useRef<Message[]>([]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ toolName: string; args: any; id: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, pendingAction]);

    const tools = useMemo(() => ([
        {
            function_declarations: [
                {
                    name: 'get_work_logs',
                    description: 'Haal werk logs op.',
                    parameters: { type: 'object', properties: { startDate: { type: 'string' }, endDate: { type: 'string' } } }
                },
                {
                    name: 'get_projects',
                    description: 'Haal projecten op.',
                    parameters: { type: 'object', properties: {} }
                },
                {
                    name: 'get_recent_messages',
                    description: 'Haal de laatste berichten op voor context.',
                    parameters: { type: 'object', properties: {} }
                },
                {
                    name: 'add_work_entry',
                    description: 'Voeg werk toe (vraagt toestemming).',
                    parameters: {
                        type: 'object',
                        properties: {
                            date: { type: 'string' },
                            hours: { type: 'number' },
                            note: { type: 'string' },
                            projectName: { type: 'string' }
                        },
                        required: ['date', 'hours']
                    }
                },
                {
                    name: 'set_daily_habits',
                    description: 'Stel habits in (vraagt toestemming).',
                    parameters: {
                        type: 'object',
                        properties: {
                            date: { type: 'string' },
                            wakeTime: { type: 'string' },
                            sleepTime: { type: 'string' }
                        },
                        required: ['date']
                    }
                }
            ]
        }
    ]), [data]);

    const executeToolInternal = async (name: string, args: any) => {
        switch (name) {
            case 'get_recent_messages':
                return messagesRef.current.slice(-6).map(m => ({ role: m.role === 'ai' ? 'model' : 'user', text: m.content }));
            case 'get_work_logs':
                return data.workLogEntries.filter(e => (!args.startDate || e.work_date >= args.startDate) && (!args.endDate || e.work_date <= args.endDate)).slice(-20).map(e => ({ datum: e.work_date, uren: e.hours, notitie: e.note, project: data.projects.find(p => p.id === e.project_id)?.name || 'Geen' }));
            case 'get_projects':
                return data.projects.map(p => ({ naam: p.name, uren: data.workLogEntries.filter(e => e.project_id === p.id).reduce((s, e) => s + e.hours, 0) }));
            case 'add_work_entry':
                const pj = data.projects.find(p => p.name.toLowerCase() === args.projectName?.toLowerCase());
                await onAddWorkLog(args.date, args.hours, args.note, pj?.id);
                return { success: true, message: `Sessie van ${args.hours}u toegevoegd.` };
            case 'set_daily_habits':
                await onUpsertHabit(args.date, args.wakeTime || null, args.sleepTime || null);
                return { success: true, message: `Habits bijgewerkt.` };
            default: return { error: 'Tool niet gevonden' };
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || pendingAction) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) return;

        try {
            const systemInst = `Vandaag is het ${new Date().toISOString().split('T')[0]}. 
            Je bent OBSERVER v3.1 Preview, gebouwd op Gemini 3.1 Flash Lite Preview. 
            Geen automatisch geheugen; gebruik get_recent_messages als je context nodig hebt.
            Voor acties (add/set) vraag je toestemming via de tool call.
            Antwoord altijd professioneel in het Nederlands.`;

            let currentHistory = [{ role: 'user', parts: [{ text: userMsg }] }];
            let response = await generateGeminiContent(userMsg, apiKey, systemInst, tools);
            if (response.error) throw new Error(response.error);

            let toolLoopCount = 0;
            while (response.tool_calls && response.tool_calls.length > 0 && toolLoopCount < 3) {
                const actionCall = response.tool_calls.find(tc => ['add_work_entry', 'set_daily_habits'].includes(tc.name));
                if (actionCall) {
                    setPendingAction({ toolName: actionCall.name, args: actionCall.args, id: actionCall.name + Date.now() });
                    setMessages(prev => [...prev, { role: 'ai', content: response.text || 'Ik heb een actie voorbereid. Bevestigen?', actionProposal: { toolName: actionCall.name, args: actionCall.args, id: actionCall.name + Date.now() } }]);
                    setIsLoading(false);
                    return; 
                }

                const results = await Promise.all(response.tool_calls.map(async tc => ({ name: tc.name, content: await executeToolInternal(tc.name, tc.args) })));
                currentHistory.push({ role: 'model', parts: response.tool_calls.map(tc => ({ functionCall: tc })) });
                currentHistory.push({ role: 'user', parts: results.map(r => ({ functionResponse: { name: r.name, response: { content: r.content } } })) });

                response = await respondToToolCall(currentHistory, results, apiKey, systemInst);
                if (response.error) throw new Error(response.error);
                toolLoopCount++;
            }
            setMessages(prev => [...prev, { role: 'ai', content: response.text }]);
        } catch (err: any) { setMessages(prev => [...prev, { role: 'ai', content: `❌ Fout: ${err.message}` }]); } finally { setIsLoading(false); }
    };

    const confirmAction = async (approved: boolean) => {
        if (!pendingAction) return;
        setIsLoading(true);
        const action = pendingAction;
        setPendingAction(null);
        if (approved) {
            try {
                const result = await executeToolInternal(action.toolName, action.args);
                setMessages(prev => [...prev, { role: 'ai', content: `✅ Voltooid: ${result.message}` }]);
            } catch (err: any) { setMessages(prev => [...prev, { role: 'ai', content: `❌ Fout: ${err.message}` }]); }
        } else { setMessages(prev => [...prev, { role: 'ai', content: 'Geannuleerd.' }]); }
        setIsLoading(false);
    };

    return (
        <>
            <button onClick={() => setIsOpen(!isOpen)} style={{ position: 'fixed', bottom: '24px', right: '24px', width: '64px', height: '64px', borderRadius: '0', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid black', boxShadow: '8px 8px 0px black', cursor: 'pointer', zIndex: 1000 }} >
                {isOpen ? <X size={32} /> : <MessageSquare size={32} />}
            </button>
            {isOpen && (
                <div style={{ position: 'fixed', bottom: '104px', right: '24px', width: '420px', maxWidth: 'calc(100vw - 48px)', height: '650px', background: 'var(--color-bg)', border: '4px solid black', boxShadow: '12px 12px 0px black', display: 'flex', flexDirection: 'column', zIndex: 1000 }}>
                    <div style={{ padding: '16px', background: 'black', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>OBSERVER v3.1p</span>
                        <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                    </div>
                    <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: '#F0F0F0' }}>
                        {messages.map((msg, i) => (
                            <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: '900', opacity: 0.5, marginBottom: '4px' }}>{msg.role === 'user' ? 'USER' : 'OBS_31P'}</div>
                                <div style={{ padding: '12px 16px', background: msg.role === 'user' ? 'black' : 'white', color: msg.role === 'user' ? 'white' : 'black', border: '3px solid black', boxShadow: msg.role === 'user' ? 'none' : '4px 4px 0px black' }} className="chat-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                    {msg.actionProposal && (
                                        <div className="proposal-box" style={{ border: '4px solid var(--color-primary)', background: 'white', padding: '12px', marginTop: '10px', boxShadow: '4px 4px 0px black' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>🚀 ACTION_PENDING</div>
                                            <div style={{ fontSize: '0.8rem', marginBottom: '12px' }}>
                                                {msg.actionProposal.toolName === 'add_work_entry' ? (
                                                    <>**{msg.actionProposal.args.hours}u** on **{msg.actionProposal.args.projectName || '-'}** for **{msg.actionProposal.args.date}**.</>
                                                ) : (
                                                    <>Habits for **{msg.actionProposal.args.date}**.</>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => confirmAction(true)} style={{ flex: 1, padding: '8px', background: 'var(--color-primary)', color: 'white', border: '2px solid black', fontWeight: '900', cursor: 'pointer' }}>APPROVE</button>
                                                <button onClick={() => confirmAction(false)} style={{ flex: 1, padding: '8px', background: 'white', border: '2px solid black', fontWeight: '900', cursor: 'pointer' }}>DECLINE</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && <div style={{ fontWeight: '900', fontSize: '0.7rem' }}>OBSERVING (3.1 PREVIEW)...</div>}
                    </div>
                    <div style={{ padding: '16px', borderTop: '4px solid black', display: 'flex', gap: '10px', background: 'white' }}>
                        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder={pendingAction ? "Wait for approval..." : "Input query..."} disabled={!!pendingAction || isLoading} style={{ flex: 1, padding: '12px', border: '3px solid black', outline: 'none', fontWeight: '900' }} />
                        <button onClick={handleSend} disabled={isLoading || !input.trim() || !!pendingAction} style={{ width: '48px', height: '48px', background: 'black', color: 'white', border: 'none', cursor: 'pointer' }}><Send size={24} /></button>
                    </div>
                </div>
            )}
        </>
    );
};
