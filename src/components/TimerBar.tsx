import { Maximize2, Square } from 'lucide-react';
import { formatClock } from '../lib/time';

interface TimerBarProps {
    projectName: string;
    projectColor: string;
    intent: string;
    elapsedMs: number;
    onExpand: () => void;
    onStop: () => void;
}

/** Blijft zichtbaar als je het focusscherm inklapt, zodat je nooit vergeet
 *  dat de timer loopt. */
export const TimerBar = ({ projectName, projectColor, intent, elapsedMs, onExpand, onStop }: TimerBarProps) => (
    <div style={{
        position: 'fixed',
        bottom: 'var(--spacing-md)',
        left: 'var(--spacing-md)',
        right: '104px',
        maxWidth: '560px',
        zIndex: 900,
        display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: 'var(--color-bg)',
        border: 'var(--brutalist-border)',
        boxShadow: '6px 6px 0px var(--color-text)'
    }}>
        <div style={{
            width: '12px', height: '12px', borderRadius: '2px',
            background: projectColor, border: '2px solid var(--color-text)', flexShrink: 0
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
                fontWeight: 'bold', fontSize: '0.85rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
                {projectName}
            </div>
            <div style={{
                fontSize: '0.7rem', opacity: 0.6,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
                {intent}
            </div>
        </div>

        <div style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.3rem',
            color: projectColor, flexShrink: 0, fontVariantNumeric: 'tabular-nums'
        }}>
            {formatClock(elapsedMs)}
        </div>

        <button
            onClick={onExpand}
            title="Focusscherm openen"
            style={{
                display: 'flex', alignItems: 'center', padding: '6px',
                background: 'var(--color-bg)', color: 'var(--color-text)',
                border: '2px solid var(--color-text)', cursor: 'pointer', flexShrink: 0
            }}
        >
            <Maximize2 size={16} />
        </button>

        <button
            onClick={onStop}
            title="Timer stoppen"
            style={{
                display: 'flex', alignItems: 'center', padding: '6px',
                background: 'var(--color-primary)', color: 'white',
                border: '2px solid var(--color-text)', cursor: 'pointer', flexShrink: 0
            }}
        >
            <Square size={16} fill="white" />
        </button>
    </div>
);
