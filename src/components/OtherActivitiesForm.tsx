import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { generateGeminiContent } from '../lib/gemini';
import type { OtherActivity } from '../types/work';

interface OtherActivitiesFormProps {
    date: string;
    activities: OtherActivity[];
    onAdd: (date: string, label: string, hours: number, note: string | null) => Promise<any>;
    onDelete: (id: string) => Promise<any>;
}

export const OtherActivitiesForm: React.FC<OtherActivitiesFormProps> = ({
    date,
    activities,
    onAdd,
    onDelete
}) => {
    const [label, setLabel] = useState('');
    const [hours, setHours] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [isImproving, setIsImproving] = useState(false);

    const handleAIImprove = async () => {
        if (!note.trim()) return;
        
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            alert('Voeg VITE_GEMINI_API_KEY toe aan je .env bestand!');
            return;
        }

        setIsImproving(true);
        const prompt = `Verbeter de volgende notitie voor een activiteit tracker om het professioneler en duidelijker te maken. Houd het kort en krachtig (max 500 tekens). Antwoord ALLEEN met de verbeterde tekst, geen inleiding of afsluiting.
        Notitie: "${note}"`;

        const result = await generateGeminiContent(prompt, apiKey);
        if (result.error) {
            alert(`AI Fout: ${result.error}`);
        } else if (result.text) {
            setNote(result.text.trim().slice(0, 500));
        }
        setIsImproving(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label || !hours) return;

        setLoading(true);
        await onAdd(date, label, parseFloat(hours), note || null);
        setLabel('');
        setHours('');
        setNote('');
        setLoading(false);
    };

    return (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <form onSubmit={handleSubmit} style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                flexWrap: 'wrap',
                marginBottom: 'var(--spacing-md)'
            }}>
                <div style={{ flex: 2, minWidth: '150px' }}>
                    <input
                        type="text"
                        placeholder="Activiteit (bijv. School, Sport)"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '3px solid var(--color-text)',
                            background: 'var(--color-bg)',
                            fontWeight: 'bold'
                        }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '80px' }}>
                    <input
                        type="number"
                        placeholder="Uren"
                        step="0.1"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '3px solid var(--color-text)',
                            background: 'var(--color-bg)',
                            fontWeight: 'bold'
                        }}
                    />
                </div>
                <div style={{ flex: 2, minWidth: '150px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                         <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7 }}>Opmerking</span>
                         <button
                            type="button"
                            onClick={handleAIImprove}
                            disabled={isImproving || !note.trim()}
                            title="AI Verbeter"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'var(--color-primary)',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                opacity: (!note.trim() || isImproving) ? 0.3 : 1
                            }}
                        >
                            {isImproving ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            AI
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Opmerking (optioneel)"
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 500))}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '3px solid var(--color-text)',
                            background: 'var(--color-bg)',
                            fontWeight: 'bold',
                            boxSizing: 'border-box'
                        }}
                    />
                    <div style={{ fontSize: '0.6rem', opacity: 0.5, textAlign: 'right', marginTop: '2px' }}>
                        {note.length}/500
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        background: 'var(--color-primary)',
                        color: 'var(--color-bg)',
                        border: '3px solid var(--color-text)',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '4px 4px 0px var(--color-text)'
                    }}
                >
                    <Plus size={20} /> TOEVOEGEN
                </button>
            </form>

            <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                {activities && activities.length > 0 ? activities.map(item => (
                    <div key={item.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 15px',
                        background: 'rgba(var(--color-text-rgb), 0.05)',
                        border: '2px solid var(--color-text)',
                        fontWeight: 'bold'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BookOpen size={16} color="var(--color-primary)" />
                            <div>
                                <span style={{ textTransform: 'uppercase' }}>{item.label}</span>
                                <span style={{ marginLeft: '10px', opacity: 0.6 }}>{item.hours}u</span>
                                {item.note && <span style={{ marginLeft: '10px', fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 'normal' }}>"{item.note}"</span>}
                            </div>
                        </div>
                        <button
                            onClick={() => onDelete(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}
                            title="Verwijderen"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )) : (
                    <div style={{ padding: '10px', fontSize: '0.9rem', opacity: 0.5, fontStyle: 'italic' }}>
                        Geen andere activiteiten geregistreerd voor vandaag.
                    </div>
                )}
            </div>
        </div>
    );
};
