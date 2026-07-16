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
        <div>
            {/* Elk veld draagt een label van gelijke hoogte, zodat de inputs en de
                knop op één lijn blijven staan. */}
            <form onSubmit={handleSubmit} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--spacing-sm)',
                flexWrap: 'wrap',
                marginBottom: 'var(--spacing-md)'
            }}>
                <div style={{ flex: 2, minWidth: '150px' }}>
                    <label className="label" htmlFor="activity-label">Activiteit</label>
                    <input
                        id="activity-label"
                        type="text"
                        placeholder="Bijv. School, Sport"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        required
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ flex: '0 1 90px', minWidth: '80px' }}>
                    <label className="label" htmlFor="activity-hours">Uren</label>
                    <input
                        id="activity-hours"
                        type="number"
                        placeholder="0"
                        step="0.1"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        required
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ flex: 2, minWidth: '150px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <label className="label" htmlFor="activity-note" style={{ marginBottom: 0 }}>Opmerking</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{note.length}/500</span>
                            <button
                                type="button"
                                onClick={handleAIImprove}
                                disabled={isImproving || !note.trim()}
                                title="Notitie verbeteren met AI"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    boxShadow: 'none',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    color: 'var(--color-primary)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 600,
                                }}
                            >
                                {isImproving ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                AI
                            </button>
                        </div>
                    </div>
                    <input
                        id="activity-note"
                        type="text"
                        placeholder="Optioneel"
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 500))}
                        style={{ width: '100%', marginTop: 'var(--spacing-2xs)', boxSizing: 'border-box' }}
                    />
                </div>
                <div>
                    {/* Onzichtbaar label: houdt de knop op dezelfde hoogte als de inputs. */}
                    <span className="label" aria-hidden="true">&nbsp;</span>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{
                            padding: 'var(--spacing-xs) var(--spacing-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2xs)',
                        }}
                    >
                        <Plus size={16} /> Toevoegen
                    </button>
                </div>
            </form>

            <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                {activities && activities.length > 0 ? activities.map(item => (
                    <div key={item.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', minWidth: 0 }}>
                            <BookOpen size={15} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <span style={{ fontWeight: 600 }}>{item.label}</span>
                                <span className="muted" style={{ marginLeft: 'var(--spacing-xs)' }}>{item.hours}u</span>
                                {item.note && (
                                    <span className="muted" style={{ marginLeft: 'var(--spacing-xs)', fontSize: 'var(--text-sm)' }}>
                                        {item.note}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => onDelete(item.id)}
                            style={{
                                display: 'flex',
                                background: 'none',
                                border: 'none',
                                boxShadow: 'none',
                                color: 'var(--color-text-muted)',
                                padding: 'var(--spacing-2xs)',
                                flexShrink: 0,
                            }}
                            title="Verwijderen"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                )) : (
                    <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                        Geen andere activiteiten geregistreerd voor vandaag.
                    </div>
                )}
            </div>
        </div>
    );
};
