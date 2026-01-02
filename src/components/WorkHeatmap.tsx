import { format, startOfYear, endOfYear, eachDayOfInterval, isToday } from 'date-fns';
import type { WorkHours } from '../pages/WorkTrackerPage';

interface WorkHeatmapProps {
    workHours: WorkHours;
    onSelectDate: (date: string) => void;
}

export const WorkHeatmap = ({ workHours, onSelectDate }: WorkHeatmapProps) => {
    const endDate = new Date();
    const startDate = startOfYear(endDate);
    const days = eachDayOfInterval({ start: startDate, end: endOfYear(endDate) });

    const getIntensity = (hours: number) => {
        if (hours === 0) return 'var(--color-bg)';
        if (hours < 2) return '#dcfce7'; // Very light green
        if (hours < 5) return '#86efac'; // Light green
        if (hours < 8) return '#22c55e'; // Green
        return '#15803d'; // Dark green
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
