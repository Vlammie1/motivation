import { useMemo } from 'react';
import { format, startOfYear, endOfYear, eachDayOfInterval, isToday } from 'date-fns';
import type { WorkHours } from '../types/work';
import { useTheme } from '../context/ThemeContext';

interface WorkHeatmapProps {
    workHours: WorkHours;
    onSelectDate: (date: string) => void;
    selectedDate?: string;
}

export const WorkHeatmap = ({ workHours, onSelectDate, selectedDate }: WorkHeatmapProps) => {
    // De kleuren hangen van het thema af. Lezen uit de context (niet uit het
    // data-theme attribuut) zodat React opnieuw rendert zodra je wisselt.
    const { theme } = useTheme();

    const days = useMemo(() => {
        const now = new Date();
        return eachDayOfInterval({ start: startOfYear(now), end: endOfYear(now) });
    }, []);

    // Calculate empty squares to align start of year with day of week
    // getDay() returns 0 for Sunday
    const emptySquares = startOfYear(new Date()).getDay();

    // Get theme-aware colors
    const getIntensity = (hours: number) => {
        // Prestige Tiers (Same for all themes to signify absolute grind mastery)
        if (hours >= 14) return '#00FFFF'; // GOD TIER (Cyan)
        if (hours >= 13) return '#AF00FF'; // ZENITH (Purple)
        if (hours >= 12) return '#FF0055'; // OVERDRIVE (Crimson)
        if (hours >= 11) return '#FF8C00'; // IGNITE (Orange)

        if (hours === 0) return 'var(--color-muted)';

        // Different color schemes for different themes
        if (theme === 'dark') {
            // VOID theme - Neon green on dark
            if (hours < 2) return 'rgba(172, 254, 202, 1)';
            if (hours < 4) return 'rgba(112, 255, 164, 1)';
            if (hours < 6) return 'rgba(57, 237, 123, 0.75)';
            if (hours < 8) return 'rgba(5, 133, 52, 1)';
            if (hours < 10) return 'rgba(1, 77, 52, 1)';
            return '#FFD700'; // GOLD for 10-10.9 (Legendary)
        } else if (theme === 'cyber') {
            // SYSTEM theme - Cyan/magenta
            if (hours < 2) return 'rgba(255, 188, 238, 1)';
            if (hours < 4) return 'rgba(245, 102, 207, 1)';
            if (hours < 6) return 'rgba(255, 3, 179, 1)';
            if (hours < 8) return 'rgba(204, 13, 109, 0.94)';
            if (hours < 10) return 'rgba(154, 2, 70, 0.78)';
            return '#00FFFF'; // Electric Cyan for 10-10.9
        } else if (theme === 'hazard') {
            // WARNING theme - Orange/red
            if (hours < 2) return 'rgba(255, 134, 134, 0.93)';
            if (hours < 4) return 'rgba(252, 81, 81, 1)';
            if (hours < 6) return 'rgba(255, 52, 52, 1)';
            if (hours < 8) return 'rgba(219, 5, 5, 1)';
            if (hours < 10) return 'rgba(134, 7, 7, 1)'; // Deep Red
            return '#FFEA00'; // Warning Yellow for 10-10.9
        } else {
            // PURE theme (light) - Blue gradient
            if (hours < 2) return 'rgba(59, 130, 246, 0.2)';
            if (hours < 4) return 'rgba(59, 130, 246, 0.5)';
            if (hours < 6) return 'rgba(59, 130, 246, 0.8)';
            if (hours < 8) return 'rgba(37, 99, 235, 1)';
            if (hours < 10) return 'rgba(0, 29, 107, 1)'; // Dark Blue
            return '#7A00FF'; // Vibrant Violet for 10-10.9
        }

        // Fallback
        return 'var(--color-primary)';
    };

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const axisLabelStyle = {
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
        fontWeight: 500,
    } as const;

    return (
        <div className="heatmap-container" style={{ overflowX: 'auto' }}>
            <div style={{ ...axisLabelStyle, display: 'flex', gap: '3px', marginBottom: 'var(--spacing-xs)', paddingLeft: '32px' }}>
                {months.map((month, i) => (
                    <div key={i} style={{ flex: 1, minWidth: '30px' }}>{month}</div>
                ))}
            </div>

            <div style={{ display: 'flex' }}>
                <div style={{
                    ...axisLabelStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    marginRight: 'var(--spacing-xs)',
                    justifyContent: 'space-between',
                    height: '111px'
                }}>
                    <span>Zo</span>
                    <span>Di</span>
                    <span>Do</span>
                    <span>Za</span>
                </div>

                <div style={{
                    display: 'grid',
                    gridAutoFlow: 'column',
                    gridTemplateRows: 'repeat(7, 1fr)',
                    gap: '3px'
                }}>
                    {/* Padding for start of year alignment */}
                    {Array.from({ length: emptySquares }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ width: '13px', height: '13px', visibility: 'hidden' }} />
                    ))}

                    {days.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const hours = workHours[dateStr] || 0;
                        const isSelected = selectedDate === dateStr;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => onSelectDate(dateStr)}
                                title={`${dateStr}: ${hours}h`}
                                style={{
                                    width: '13px',
                                    height: '13px',
                                    borderRadius: '3px',
                                    backgroundColor: getIntensity(hours),
                                    boxShadow: isToday(day) && !isSelected
                                        ? 'inset 0 0 0 1.5px var(--color-primary)'
                                        : 'inset 0 0 0 1px rgba(var(--color-text-rgb), 0.06)',
                                    outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                                    outlineOffset: '1px',
                                    cursor: 'pointer',
                                    transition: 'transform var(--transition-fast)',
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            <div style={{
                ...axisLabelStyle,
                marginTop: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
            }}>
                <span style={{ marginRight: 'var(--spacing-2xs)' }}>Minder</span>
                {[0, 2, 4, 6, 8, 10, 11, 12, 13, 14].map(h => (
                    <div
                        key={h}
                        title={`${h}h+`}
                        style={{
                            width: '13px',
                            height: '13px',
                            borderRadius: '3px',
                            backgroundColor: getIntensity(h),
                            boxShadow: 'inset 0 0 0 1px rgba(var(--color-text-rgb), 0.06)'
                        }}
                    />
                ))}
                <span style={{ marginLeft: 'var(--spacing-2xs)' }}>Grind god</span>
            </div>
        </div >
    );
};
