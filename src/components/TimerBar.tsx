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
        padding: 'var(--spacing-xs) var(--spacing-sm)',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-lg)',
    }}>
        <div style={{
            width: '10px', height: '10px', borderRadius: 'var(--radius-full)',
            background: projectColor, flexShrink: 0
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
                fontWeight: 600, fontSize: 'var(--text-sm)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
                {projectName}
            </div>
            <div className="muted" style={{
                fontSize: 'var(--text-xs)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
                {intent}
            </div>
        </div>

        <div style={{
            fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)',
            color: projectColor, flexShrink: 0, fontVariantNumeric: 'tabular-nums'
        }}>
            {formatClock(elapsedMs)}
        </div>

        <button
            onClick={onExpand}
            title="Focusscherm openen"
            style={{
                display: 'flex', alignItems: 'center', padding: 'var(--spacing-xs)',
                color: 'var(--color-text-muted)', flexShrink: 0
            }}
        >
            <Maximize2 size={15} />
        </button>

        <button
            onClick={onStop}
            title="Timer stoppen"
            className="btn-primary"
            style={{
                display: 'flex', alignItems: 'center', padding: 'var(--spacing-xs)',
                flexShrink: 0
            }}
        >
            <Square size={15} fill="currentColor" />
        </button>
    </div>
);
