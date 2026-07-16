import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface ChipOption<T extends string> {
    value: T;
    label: string;
    color: string;
}

interface ChipSelectProps<T extends string> {
    value: T;
    options: ChipOption<T>[];
    onChange: (value: T) => void;
    ariaLabel: string;
    /** Vult de knop met de kleur van de keuze; anders alleen een stip. */
    filled?: boolean;
}

const tint = (color: string, percent: number) =>
    `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const MENU_WIDTH = 160;
const MENU_MAX_HEIGHT = 240;

/** Een select met kleurcodering. Een echte <select> kan dat niet: de browser
 *  tekent de optielijst zelf en negeert vrijwel alle styling.
 *
 *  Het menu hangt in een portal met position: fixed, want de dag-modal en de
 *  kanbankolommen scrollen — een absoluut gepositioneerd menu zou daar tegen
 *  de rand kapotlopen. */
export function ChipSelect<T extends string>({
    value, options, onChange, ariaLabel, filled = true
}: ChipSelectProps<T>) {
    const [open, setOpen] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const current = options.find(o => o.value === value) || options[0];

    useLayoutEffect(() => {
        if (open) setRect(buttonRef.current?.getBoundingClientRect() ?? null);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const close = (e: Event) => {
            const target = e.target as Node;
            if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        // Bij scrollen of resizen klopt de vaste positie niet meer.
        const reposition = () => setOpen(false);

        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            document.removeEventListener('pointerdown', close);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [open]);

    // Onder de knop, tenzij daar geen ruimte is; dan erboven.
    const flipUp = rect ? rect.bottom + MENU_MAX_HEIGHT > window.innerHeight : false;
    const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)) : 0;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    maxWidth: '100%',
                    padding: '2px var(--spacing-2xs)',
                    borderRadius: 'var(--radius-sm)',
                    background: filled ? tint(current.color, 16) : 'var(--color-bg)',
                    border: `1px solid ${filled ? tint(current.color, 45) : 'var(--color-border)'}`,
                    color: filled ? current.color : 'var(--color-text)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}
            >
                <span style={{
                    width: '7px', height: '7px', borderRadius: 'var(--radius-full)',
                    background: current.color, flexShrink: 0
                }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {current.label}
                </span>
                <ChevronDown size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
            </button>

            {open && rect && createPortal(
                <div
                    ref={menuRef}
                    role="listbox"
                    aria-label={ariaLabel}
                    style={{
                        position: 'fixed',
                        top: flipUp ? undefined : rect.bottom + 4,
                        bottom: flipUp ? window.innerHeight - rect.top + 4 : undefined,
                        left,
                        zIndex: 1100,
                        width: `${MENU_WIDTH}px`,
                        maxHeight: `${MENU_MAX_HEIGHT}px`,
                        overflowY: 'auto',
                        padding: '3px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border-strong)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px'
                    }}
                >
                    {options.map(option => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => { onChange(option.value); setOpen(false); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2xs)',
                                    width: '100%',
                                    padding: 'var(--spacing-2xs) var(--spacing-xs)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isSelected ? tint(option.color, 14) : 'transparent',
                                    border: '1px solid transparent',
                                    color: 'var(--color-text)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 600,
                                    textAlign: 'left',
                                    cursor: 'pointer'
                                }}
                            >
                                <span style={{
                                    width: '8px', height: '8px', borderRadius: 'var(--radius-full)',
                                    background: option.color, flexShrink: 0
                                }} />
                                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {option.label}
                                </span>
                                {isSelected && <Check size={12} style={{ flexShrink: 0, color: option.color }} />}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
}
