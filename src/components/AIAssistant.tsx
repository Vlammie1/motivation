import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateGeminiContent, continueGeminiConversation } from '../lib/gemini';
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
    onAddOtherActivity: (date: string, label: string, hours: number, note: string | null) => Promise<any>;
}

interface ActionProposal {
    toolName: string;
    args: any;
    id: string;
}

interface Message {
    role: 'user' | 'ai';
    content: string;
    actionProposal?: ActionProposal;
}

/** Tools die de data aanpassen; die vragen eerst om toestemming. */
const ACTION_TOOLS = ['add_work_entry', 'add_other_activity', 'set_daily_habits'];

/** toISOString() rekent in UTC en levert 's avonds de dag van morgen op; dat maakt
 *  "gisteren" een dag te vroeg. Daarom de lokale datum. */
const toLocalDate = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ data, onAddWorkLog, onUpsertHabit, onAddOtherActivity }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: 'Hoi! Ik ben OBSERVER v3.1 Preview. Wat kan ik voor je opzoeken of vastleggen vandaag? ✨' }
    ]);
    const messagesRef = useRef<Message[]>([]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Het model kan meerdere acties in één beurt voorstellen (activiteit én habits);
    // elk voorstel wordt apart goedgekeurd, dus houden we ze per id bij.
    const [openActions, setOpenActions] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const hasOpenActions = openActions.length > 0;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, openActions]);

    const tools = useMemo(() => ([
        {
            function_declarations: [
                {
                    name: 'get_work_logs',
                    description: 'Haal werk logs op.',
                    parameters: { type: 'object', properties: { startDate: { type: 'string' }, endDate: { type: 'string' } } }
                },
                {
                    name: 'get_other_activities',
                    description: 'Haal niet-werk activiteiten op.',
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
                    description: 'Voeg een WERK sessie toe (vraagt toestemming).',
                    parameters: {
                        type: 'object',
                        properties: {
                            date: { type: 'string', description: 'YYYY-MM-DD' },
                            hours: { type: 'number' },
                            note: { type: 'string' },
                            projectName: { type: 'string' }
                        },
                        required: ['date', 'hours']
                    }
                },
                {
                    name: 'add_other_activity',
                    description: 'Voeg een NIET-WERK activiteit toe, bijvoorbeeld sport, school of tijd met vrienden (vraagt toestemming).',
                    parameters: {
                        type: 'object',
                        properties: {
                            date: { type: 'string', description: 'YYYY-MM-DD' },
                            label: { type: 'string', description: 'Korte naam van de activiteit, bijv. "Vrienden".' },
                            hours: { type: 'number', description: 'Duur in uren, als decimaal getal.' },
                            note: { type: 'string' }
                        },
                        required: ['date', 'label', 'hours']
                    }
                },
                {
                    name: 'set_daily_habits',
                    description: 'Stel slaap- en opsta-tijd in (vraagt toestemming).',
                    parameters: {
                        type: 'object',
                        properties: {
                            date: { type: 'string', description: 'YYYY-MM-DD' },
                            wakeTime: { type: 'string', description: 'HH:mm' },
                            sleepTime: { type: 'string', description: 'HH:mm' }
                        },
                        required: ['date']
                    }
                }
            ]
        }
    ]), []);

    const executeToolInternal = async (name: string, args: any) => {
        switch (name) {
            case 'get_recent_messages':
                return messagesRef.current.slice(-6).map(m => ({ role: m.role === 'ai' ? 'model' : 'user', text: m.content }));
            case 'get_work_logs':
                return data.workLogEntries.filter(e => (!args.startDate || e.work_date >= args.startDate) && (!args.endDate || e.work_date <= args.endDate)).slice(-20).map(e => ({ datum: e.work_date, uren: e.hours, notitie: e.note, project: data.projects.find(p => p.id === e.project_id)?.name || 'Geen' }));
            case 'get_other_activities':
                return data.otherActivities.filter(a => (!args.startDate || a.work_date >= args.startDate) && (!args.endDate || a.work_date <= args.endDate)).slice(-20).map(a => ({ datum: a.work_date, activiteit: a.label, uren: a.hours, notitie: a.note }));
            case 'get_projects':
                return data.projects.map(p => ({ naam: p.name, uren: data.workLogEntries.filter(e => e.project_id === p.id).reduce((s, e) => s + e.hours, 0) }));
            case 'add_work_entry': {
                const pj = data.projects.find(p => p.name.toLowerCase() === args.projectName?.toLowerCase());
                await onAddWorkLog(args.date, args.hours, args.note, pj?.id);
                return { success: true, message: `Sessie van ${args.hours}u toegevoegd.` };
            }
            case 'add_other_activity': {
                const { error } = (await onAddOtherActivity(args.date, args.label, args.hours, args.note || null)) || {};
                if (error) throw new Error(error.message);
                return { success: true, message: `${args.label} (${args.hours}u) toegevoegd op ${args.date}.` };
            }
            case 'set_daily_habits':
                await onUpsertHabit(args.date, args.wakeTime || null, args.sleepTime || null);
                return { success: true, message: `Habits bijgewerkt voor ${args.date}.` };
            default: return { error: 'Tool niet gevonden' };
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || hasOpenActions) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error('VITE_GEMINI_API_KEY ontbreekt in je .env bestand.');

            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            const systemInst = `Vandaag is het ${toLocalDate(today)}, gisteren was het ${toLocalDate(yesterday)}.
            Je bent OBSERVER v3.1 Preview, gebouwd op Gemini 3.1 Flash Lite Preview.
            Geen automatisch geheugen; gebruik get_recent_messages als je context nodig hebt.
            Werk leg je vast met add_work_entry; alles wat geen werk is (sport, school, vrienden)
            met add_other_activity.
            Activiteiten en werk worden opgeslagen als duur in uren, niet als begin- en eindtijd.
            Krijg je een tijdvak ("van 14:45 tot 0:00"), reken dat dan zelf om naar uren
            (dat is 9.25) en zet het tijdvak in de notitie. Een eindtijd van 0:00 of later
            hoort bij de dag ervoor.
            Slaap- en opsta-tijden horen bij set_daily_habits, niet bij een activiteit:
            de opsta-tijd hoort bij de dag waarop je opstaat.
            Voor acties (add/set) vraag je toestemming via de tool call. Je mag meerdere
            acties in één beurt voorstellen.
            Antwoord altijd professioneel in het Nederlands.`;

            const currentHistory: any[] = [{ role: 'user', parts: [{ text: userMsg }] }];
            let response = await generateGeminiContent(userMsg, apiKey, systemInst, tools);
            if (response.error) throw new Error(response.error);

            let toolLoopCount = 0;
            while (response.tool_calls && response.tool_calls.length > 0 && toolLoopCount < 3) {
                const actionCalls = response.tool_calls.filter(tc => ACTION_TOOLS.includes(tc.name));
                if (actionCalls.length > 0) {
                    // Elk voorstel krijgt een eigen id, anders deelt een tweede actie in
                    // dezelfde beurt de knoppen van de eerste.
                    const proposals: ActionProposal[] = actionCalls.map((tc, i) => ({
                        toolName: tc.name,
                        args: tc.args,
                        id: `${tc.name}-${Date.now()}-${i}`
                    }));
                    setOpenActions(proposals.map(p => p.id));
                    setMessages(prev => [
                        ...prev,
                        ...proposals.map((proposal, i) => ({
                            role: 'ai' as const,
                            content: i === 0 ? (response.text || 'Ik heb een actie voorbereid. Bevestigen?') : '',
                            actionProposal: proposal
                        }))
                    ]);
                    return;
                }

                const results = await Promise.all(response.tool_calls.map(async tc => ({ name: tc.name, content: await executeToolInternal(tc.name, tc.args) })));

                // The model's parts go back untouched — they carry the thought signatures Gemini
                // requires alongside each functionCall.
                currentHistory.push({ role: 'model', parts: response.modelParts });
                currentHistory.push({
                    role: 'user',
                    parts: results.map(r => ({
                        functionResponse: {
                            name: r.name,
                            response: { name: r.name, content: r.content }
                        }
                    }))
                });

                response = await continueGeminiConversation(currentHistory, apiKey, systemInst, tools);
                if (response.error) throw new Error(response.error);

                toolLoopCount++;
            }
            // Een lege tekst zou een leeg bericht opleveren dat op een vastloper lijkt.
            setMessages(prev => [...prev, {
                role: 'ai',
                content: response.text || 'Ik kon hier geen antwoord op formuleren. Probeer het anders te vragen.'
            }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'ai', content: `❌ Fout: ${err.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const confirmAction = async (proposal: ActionProposal, approved: boolean) => {
        setOpenActions(prev => prev.filter(id => id !== proposal.id));
        if (!approved) {
            setMessages(prev => [...prev, { role: 'ai', content: 'Geannuleerd.' }]);
            return;
        }
        setIsLoading(true);
        try {
            const result = await executeToolInternal(proposal.toolName, proposal.args);
            setMessages(prev => [...prev, { role: 'ai', content: `✅ Voltooid: ${(result as any).message || 'Actie voltooid'}` }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'ai', content: `❌ Fout: ${err.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const describeProposal = (proposal: ActionProposal) => {
        const { toolName, args } = proposal;
        if (toolName === 'add_work_entry') {
            return `${args.hours}u werk op ${args.projectName || 'geen project'} voor ${args.date}.`;
        }
        if (toolName === 'add_other_activity') {
            return `${args.hours}u "${args.label}" (geen werk) voor ${args.date}${args.note ? ` — ${args.note}` : ''}.`;
        }
        const times = [
            args.sleepTime ? `slapen ${args.sleepTime}` : null,
            args.wakeTime ? `opstaan ${args.wakeTime}` : null
        ].filter(Boolean).join(', ');
        return `Habits voor ${args.date}${times ? `: ${times}` : ''}.`;
    };

    return (
        <>
            <button onClick={() => setIsOpen(!isOpen)} style={{ position: 'fixed', bottom: '24px', right: '24px', width: '64px', height: '64px', borderRadius: '0', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border-strong)', cursor: 'pointer', zIndex: 1000 }} >
                {isOpen ? <X size={32} /> : <MessageSquare size={32} />}
            </button>
            {isOpen && (
                <div style={{ position: 'fixed', bottom: '104px', right: '24px', width: '420px', maxWidth: 'calc(100vw - 48px)', height: '650px', background: 'var(--color-bg)', border: '1px solid var(--color-border-strong)', display: 'flex', flexDirection: 'column', zIndex: 1000 }}>
                    <div style={{ padding: '16px', background: 'black', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>OBSERVER v3.1p</span>
                        <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                    </div>
                    {/* Het paneel volgt het thema: een vaste lichte achtergrond maakt de
                        tekst eronder onleesbaar zodra het thema donker is. */}
                    <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
                        {messages.map((msg, i) => (
                            <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: '900', opacity: 0.5, marginBottom: '4px' }}>{msg.role === 'user' ? 'USER' : 'OBS_31P'}</div>
                                <div style={{ padding: '12px 16px', background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg)', color: msg.role === 'user' ? 'white' : 'var(--color-text)', border: '1px solid var(--color-border-strong)' }} className="chat-content">
                                    {msg.content && <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>}
                                    {msg.actionProposal && (
                                        <div className="proposal-box" style={{ border: '1px solid var(--color-primary)', background: 'var(--color-surface-2)', padding: '12px', marginTop: msg.content ? '10px' : 0 }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>🚀 ACTION_PENDING</div>
                                            <div style={{ fontSize: '0.8rem', marginBottom: '12px' }}>
                                                {describeProposal(msg.actionProposal)}
                                            </div>
                                            {openActions.includes(msg.actionProposal.id) ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => confirmAction(msg.actionProposal!, true)} style={{ flex: 1, padding: '8px', background: 'var(--color-primary)', color: 'white', border: '1px solid var(--color-border-strong)', fontWeight: '900', cursor: 'pointer' }}>APPROVE</button>
                                                    <button onClick={() => confirmAction(msg.actionProposal!, false)} style={{ flex: 1, padding: '8px', background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border-strong)', fontWeight: '900', cursor: 'pointer' }}>DECLINE</button>
                                                </div>
                                            ) : (
                                                <div className="muted" style={{ fontSize: '0.7rem', fontWeight: '900' }}>AFGEHANDELD</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && <div style={{ fontWeight: '900', fontSize: '0.7rem', color: 'var(--color-text)' }}>OBSERVING (3.1 PREVIEW)...</div>}
                    </div>
                    <div style={{ padding: '16px', borderTop: '1px solid var(--color-border-strong)', display: 'flex', gap: '10px', background: 'var(--color-bg)' }}>
                        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder={hasOpenActions ? "Wacht op goedkeuring..." : "Input query..."} disabled={hasOpenActions || isLoading} style={{ flex: 1, padding: '12px', border: '1px solid var(--color-border-strong)', outline: 'none', fontWeight: '900' }} />
                        <button onClick={handleSend} disabled={isLoading || !input.trim() || hasOpenActions} style={{ width: '48px', height: '48px', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}><Send size={24} /></button>
                    </div>
                </div>
            )}
        </>
    );
};
