import { format, startOfYear, endOfYear, eachDayOfInterval, isToday } from 'date-fns';
import type { WorkHours } from '../types/work';

interface WorkHeatmapProps {
    workHours: WorkHours;
    onSelectDate: (date: string) => void;
    selectedDate?: string;
}

export const WorkHeatmap = ({ workHours, onSelectDate, selectedDate }: WorkHeatmapProps) => {
    const endDate = new Date();
    const startDate = startOfYear(endDate);
    const days = eachDayOfInterval({ start: startDate, end: endOfYear(endDate) });

    // Get theme-aware colors
    const getIntensity = (hours: number) => {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';

        if (hours === 0) return 'transparent';

        // Different color schemes for different themes
        if (theme === 'void' || theme === 'dark') {
            // VOID theme - Neon green on dark
            if (hours < 2) return 'rgba(34, 197, 94, 0.25)';
            if (hours < 4) return 'rgba(34, 197, 94, 0.5)';
            if (hours < 6) return 'rgba(34, 197, 94, 0.75)';
            if (hours < 8) return 'rgba(34, 197, 94, 1)';
            return 'rgba(16, 185, 129, 1)';
        } else if (theme === 'cyber' || theme === 'system') {
            // SYSTEM theme - Cyan/magenta
            if (hours < 2) return 'rgba(6, 182, 212, 0.3)';
            if (hours < 4) return 'rgba(6, 182, 212, 0.6)';
            if (hours < 6) return 'rgba(139, 92, 246, 0.8)';
            if (hours < 8) return 'rgba(236, 72, 153, 1)';
            return 'rgba(219, 39, 119, 1)';
        } else if (theme === 'hazard' || theme === 'warning') {
            // WARNING theme - Orange/red
            if (hours < 2) return 'rgba(251, 191, 36, 0.3)';
            if (hours < 4) return 'rgba(251, 191, 36, 0.6)';
            if (hours < 6) return 'rgba(249, 115, 22, 0.8)';
            if (hours < 8) return 'rgba(239, 68, 68, 1)';
            return 'rgba(153, 27, 27, 1)'; // Deep Red
        } else if (theme === 'pure' || theme === 'light') {
            // PURE theme (light) - Blue gradient
            if (hours < 2) return 'rgba(59, 130, 246, 0.2)';
            if (hours < 4) return 'rgba(59, 130, 246, 0.5)';
            if (hours < 6) return 'rgba(59, 130, 246, 0.8)';
            if (hours < 8) return 'rgba(37, 99, 235, 1)';
            return 'rgba(29, 78, 216, 1)'; // Dark Blue
        }

        // Fallback
        return 'var(--color-primary)';
    };

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return (
        <div className="heatmap-container" style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: 'var(--spacing-sm)', fontSize: '0.7rem', color: 'gray', paddingLeft: '30px' }}>
                {months.map((month, i) => (
                    <div key={i} style={{ flex: 1, minWidth: '30px' }}>{month}</div>
                ))}
            </div>

            <div style={{ display: 'flex' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginRight: '8px', fontSize: '0.7rem', color: 'gray', justifyContent: 'space-around' }}>
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                </div>

                <div style={{
                    display: 'grid',
                    gridAutoFlow: 'column',
                    gridTemplateRows: 'repeat(7, 1fr)',
                    gap: '4px'
                }}>
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
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: getIntensity(hours),
                                    border: isSelected
                                        ? '2px solid white'
                                        : (isToday(day) ? '2px solid var(--color-primary)' : '1px solid var(--color-text)'),
                                    outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                                    outlineOffset: '1px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s',
                                    opacity: hours === 0 ? 0.5 : 1
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.8rem' }}>
                <span>Less</span>
                {[0, 1, 4, 7, 10].map(h => (
                    <div key={h} style={{ width: '12px', height: '12px', backgroundColor: getIntensity(h), border: '1px solid var(--color-text)' }} />
                ))}
                <span>More</span>
            </div>
        </div>
    );
};
