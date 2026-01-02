import { format, startOfYear, endOfYear, eachDayOfInterval, isToday } from 'date-fns';
import type { WorkHours } from '../types/work';

interface WorkHeatmapProps {
    workHours: WorkHours;
    onSelectDate: (date: string) => void;
}

export const WorkHeatmap = ({ workHours, onSelectDate }: WorkHeatmapProps) => {
    const endDate = new Date();
    const startDate = startOfYear(endDate);
    const days = eachDayOfInterval({ start: startDate, end: endOfYear(endDate) });

    // Get theme-aware colors
    const getIntensity = (hours: number) => {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';

        if (hours === 0) return 'var(--color-bg)';

        // Different color schemes for different themes
        if (theme === 'dark') {
            // Neon colors for dark theme
            if (hours < 2) return 'rgba(34, 197, 94, 0.2)';   // Very faint green
            if (hours < 5) return 'rgba(34, 197, 94, 0.5)';   // Medium green
            if (hours < 8) return 'rgba(34, 197, 94, 0.8)';   // Bright green
            return 'rgba(34, 197, 94, 1)';                     // Full green
        } else if (theme === 'cyberpunk') {
            // Cyan/magenta for cyberpunk
            if (hours < 2) return 'rgba(6, 182, 212, 0.3)';   // Faint cyan
            if (hours < 5) return 'rgba(6, 182, 212, 0.6)';   // Medium cyan
            if (hours < 8) return 'rgba(236, 72, 153, 0.7)';  // Pink
            return 'rgba(236, 72, 153, 1)';                    // Full magenta
        } else if (theme === 'retro') {
            // Orange/yellow for retro
            if (hours < 2) return 'rgba(251, 191, 36, 0.3)';  // Faint amber
            if (hours < 5) return 'rgba(251, 191, 36, 0.6)';  // Medium amber
            if (hours < 8) return 'rgba(249, 115, 22, 0.8)';  // Orange
            return 'rgba(249, 115, 22, 1)';                    // Full orange
        } else {
            // Default light theme - use primary color
            if (hours < 2) return 'rgba(59, 130, 246, 0.2)';  // Very light blue
            if (hours < 5) return 'rgba(59, 130, 246, 0.5)';  // Light blue
            if (hours < 8) return 'rgba(59, 130, 246, 0.8)';  // Blue
            return 'rgba(59, 130, 246, 1)';                    // Full blue
        }
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
                        return (
                            <div
                                key={dateStr}
                                onClick={() => onSelectDate(dateStr)}
                                title={`${dateStr}: ${hours}h`}
                                style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: getIntensity(hours),
                                    border: isToday(day) ? '2px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s',
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.8rem' }}>
                <span>Less</span>
                {[0, 1, 4, 7, 10].map(h => (
                    <div key={h} style={{ width: '12px', height: '12px', backgroundColor: getIntensity(h), border: '1px solid rgba(0,0,0,0.1)' }} />
                ))}
                <span>More</span>
            </div>
        </div>
    );
};
