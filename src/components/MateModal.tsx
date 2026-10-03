import { useEffect, useState } from 'react';
import { X, Copy, Check, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Stand = { aangemaakt_op: string; laatst_gebruikt: string | null } | null;

const MCP_URL = `${window.location.origin}/api/mcp`;

const datumTijd = (iso: string) =>
    new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Mate koppelen: een sleutel waarmee Mate via de MCP-route (`/api/mcp`) werk en slaap wegschrijft.
 * De sleutel staat maar één keer in beeld; in de database staat alleen de hash.
 */
export const MateModal = ({ isOpen, onClose }: MateModalProps) => {
    const [stand, setStand] = useState<Stand>(null);
    const [sleutel, setSleutel] = useState<string | null>(null);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);
    const [gekopieerd, setGekopieerd] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        supabase.rpc('mate_sleutel_stand').then(({ data, error }) => {
            if (error) setFout('De koppeling staat nog niet in de database. Voer de migratie 20261003_mate_mcp.sql uit in Supabase.');
            else setStand((data as Stand) ?? null);
        });
    }, [isOpen]);

    if (!isOpen) return null;

    const maak = async () => {
        setBezig(true);
        setFout(null);
        const { data, error } = await supabase.rpc('mate_maak_sleutel');
        setBezig(false);
        if (error) {
            setFout(error.message);
            return;
        }
        setSleutel(data as string);
        setStand({ aangemaakt_op: new Date().toISOString(), laatst_gebruikt: null });
    };

    const kopieer = async (wat: string, tekst: string) => {
        await navigator.clipboard.writeText(tekst).catch(() => undefined);
        setGekopieerd(wat);
        window.setTimeout(() => setGekopieerd(null), 1500);
    };

    const veld = (wat: string, waarde: string) => (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
            <code
                style={{
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-xs)',
                }}
            >
                {waarde}
            </code>
            <button className="modal-close" onClick={() => kopieer(wat, waarde)} aria-label="Kopiëren">
                {gekopieerd === wat ? <Check size={16} /> : <Copy size={16} />}
            </button>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ fontSize: 'var(--text-xl)' }}>Mate koppelen</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Sluiten">
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
                        Mate zet je werk hier neer, bij het juiste project, en houdt bij wanneer je sliep. Afleiding komt er
                        niet in.
                    </p>

                    <div>
                        <span className="label">MCP-adres</span>
                        {veld('url', MCP_URL)}
                    </div>

                    {sleutel ? (
                        <div>
                            <span className="label">Sleutel (alleen nu zichtbaar)</span>
                            {veld('sleutel', sleutel)}
                            <p className="muted" style={{ fontSize: 'var(--text-xs)', margin: 'var(--spacing-xs) 0 0' }}>
                                Zet hem bij Mate als <code>motivatieSleutel</code> in config.local.json.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <span className="label">Sleutel</span>
                            <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
                                {stand
                                    ? `Gemaakt op ${datumTijd(stand.aangemaakt_op)}${stand.laatst_gebruikt ? `, laatst gebruikt ${datumTijd(stand.laatst_gebruikt)}` : ', nog niet gebruikt'}.`
                                    : 'Nog geen sleutel.'}
                            </p>
                        </div>
                    )}

                    {fout && <p style={{ color: '#b91c1c', fontSize: 'var(--text-sm)', margin: 0 }}>{fout}</p>}

                    {!sleutel && (
                        <button className="btn-primary" onClick={maak} disabled={bezig} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-xs)' }}>
                            {bezig ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                            {stand ? 'Nieuwe sleutel (de oude vervalt)' : 'Maak een sleutel'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
