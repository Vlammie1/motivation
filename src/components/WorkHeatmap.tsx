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

    // Calculate empty squares to align start of year with day of week
    // getDay() returns 0 for Sunday
    const emptySquares = startOfYear(endDate).getDay();

    // Get theme-aware colors
    const getIntensity = (hours: number) => {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';

        if (hours === 0) return 'transparent';

        // Different color schemes for different themes
        if (theme === 'void' || theme === 'dark') {
            // VOID theme - Neon green on dark
            if (hours < 2) return 'rgba(172, 254, 202, 1)';
            if (hours < 4) return 'rgba(112, 255, 164, 1)';
            if (hours < 6) return 'rgba(57, 237, 123, 0.75)';
            if (hours < 8) return 'rgba(5, 133, 52, 1)';
            if (hours < 10) return 'rgba(1, 77, 52, 1)';
            return '#FFD700'; // GOLD for 10+ (Legendary)
        } else if (theme === 'cyber' || theme === 'system') {
            // SYSTEM theme - Cyan/magenta
            if (hours < 2) return 'rgba(255, 188, 238, 1)';
            if (hours < 4) return 'rgba(245, 102, 207, 1)';
            if (hours < 6) return 'rgba(255, 3, 179, 1)';
            if (hours < 8) return 'rgba(204, 13, 109, 0.94)';
            if (hours < 10) return 'rgba(154, 2, 70, 0.78)';
            return '#00FFFF'; // Electric Cyan for 10+
        } else if (theme === 'hazard' || theme === 'warning') {
            // WARNING theme - Orange/red
            if (hours < 2) return 'rgba(255, 134, 134, 0.93)';
            if (hours < 4) return 'rgba(252, 81, 81, 1)';
            if (hours < 6) return 'rgba(255, 52, 52, 1)';
            if (hours < 8) return 'rgba(219, 5, 5, 1)';
            if (hours < 10) return 'rgba(134, 7, 7, 1)'; // Deep Red
            return '#FFEA00'; // Warning Yellow for 10+
        } else {
            // PURE theme (light) - Blue gradient
            if (hours < 2) return 'rgba(59, 130, 246, 0.2)';
            if (hours < 4) return 'rgba(59, 130, 246, 0.5)';
            if (hours < 6) return 'rgba(59, 130, 246, 0.8)';
            if (hours < 8) return 'rgba(37, 99, 235, 1)';
            if (hours < 10) return 'rgba(0, 29, 107, 1)'; // Dark Blue
            return '#7A00FF'; // Vibrant Violet for 10+
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginRight: '8px', fontSize: '0.7rem', color: 'gray', justifyContent: 'space-between', height: '112px' }}>
                    <span>Sun</span>
                    <span>Tue</span>
                    <span>Thu</span>
                    <span>Sat</span>
                </div>

                <div style={{
                    display: 'grid',
                    gridAutoFlow: 'column',
                    gridTemplateRows: 'repeat(7, 1fr)',
                    gap: '4px'
                }}>
                    {/* Padding for start of year alignment */}
                    {Array.from({ length: emptySquares }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ width: '12px', height: '12px', visibility: 'hidden' }} />
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
                {[0, 1, 3, 5, 7.5, 10].map(h => (
                    <div key={h} style={{ width: '12px', height: '12px', backgroundColor: getIntensity(h), border: '1px solid var(--color-text)' }} />
                ))}
                <span>More</span>
            </div>
        </div >
    );
};
