import React, { useState, useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfDay, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { DailyHabit, OtherActivity } from '../types/work';
import type { WorkLogEntry } from '../hooks/useSupabaseWorkLogs';
import type { Project } from '../hooks/useSupabaseProjects';

interface ActivityScheduleChartProps {
    dailyHabits: Record<string, DailyHabit>;
    workLogEntries: WorkLogEntry[];
    otherActivities: OtherActivity[];
    projects: Project[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ActivityScheduleChart: React.FC<ActivityScheduleChartProps> = ({
    dailyHabits,
    workLogEntries,
    otherActivities,
    projects
}) => {
    const [viewRange, setViewRange] = useState(14); // 7, 14, 30 days
    const [offset, setOffset] = useState(0);
    const [hoverInfo, setHoverInfo] = useState<{ date: string; type: 'wake' | 'sleep' | 'work' | 'other'; label?: string; hours?: number; time?: string; note?: string | null } | null>(null);

    const chartData = useMemo(() => {
        const end = subDays(startOfDay(new Date()), offset * viewRange);
        const start = subDays(end, viewRange - 1);

        const days = eachDayOfInterval({ start, end });

        return days.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const habit = dailyHabits[dateStr];
            const dayEntries = workLogEntries.filter(e => e.work_date === dateStr);
            const dayOther = otherActivities.filter(e => e.work_date === dateStr);

            // Convert "HH:mm" to decimal hours
            const timeToDecimal = (timeStr: string | null | undefined) => {
                if (!timeStr) return null;
                const [h, m] = timeStr.split(':').map(Number);
                return h + m / 60;
            };

            let wake = timeToDecimal(habit?.wake_time);
            let sleep = timeToDecimal(habit?.sleep_time);

            // Handle sleep after midnight
            if (wake !== null && sleep !== null && sleep < wake) {
                sleep += 24;
            }

            const awakeHours = (wake !== null && sleep !== null) ? (sleep - wake) : 0;
            const totalWorkHours = dayEntries.reduce((sum, e) => sum + Number(e.hours), 0);
            const totalOtherHours = dayOther.reduce((sum, e) => sum + Number(e.hours), 0);

            return {
                date: dateStr,
                displayDate: format(date, 'dd/MM'),
                dayName: DAY_NAMES[getDay(date)],
                wake,
                sleep,
                awakeHours,
                totalWorkHours,
                totalOtherHours,
                entries: dayEntries,
                otherEntries: dayOther,
                habit
            };
        });
    }, [dailyHabits, workLogEntries, otherActivities, viewRange, offset]);

    // Calculate Y-axis range
    const yRange = useMemo(() => {
        let minWake = 8;
        let maxSleep = 23;

        chartData.forEach((d: any) => {
            if (d.wake !== null) minWake = Math.min(minWake, d.wake);
            if (d.sleep !== null) maxSleep = Math.max(maxSleep, d.sleep);
            
            if (d.wake !== null && (d.totalWorkHours + d.totalOtherHours) > 0) {
                maxSleep = Math.max(maxSleep, d.wake + d.totalWorkHours + d.totalOtherHours);
            }
        });

        const min = Math.max(0, Math.floor(minWake - 1));
        const max = Math.min(32, Math.ceil(maxSleep + 1));

        return { min, max };
    }, [chartData]);

    const chartHeight = 350;
    const getY = (time: number) => {
        const totalRange = yRange.max - yRange.min;
        return ((time - yRange.min) / totalRange) * chartHeight;
    };

    const projectColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        projects.forEach(p => {
            map[p.id] = p.color;
        });
        return map;
    }, [projects]);

    return (
        <div style={{
            marginTop: 'var(--spacing-xl)',
            paddingTop: 'var(--spacing-lg)',
            borderTop: '3px solid var(--color-text)',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Clock size={20} color="var(--color-primary)" />
                    <h3 style={{ textTransform: 'uppercase', margin: 0, fontSize: '1rem' }}>Activity Schedule</h3>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', border: '2px solid var(--color-text)', background: 'var(--color-bg)' }}>
                        {[7, 14, 30].map(r => (
                            <button
                                key={r}
                                onClick={() => { setViewRange(r); setOffset(0); }}
                                style={{
                                    padding: '4px 8px',
                                    border: 'none',
                                    background: viewRange === r ? 'var(--color-text)' : 'transparent',
                                    color: viewRange === r ? 'var(--color-bg)' : 'var(--color-text)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    fontSize: '0.7rem'
                                }}
                            >
                                {r === 30 ? '1M' : `${r / 7}W`}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', border: '2px solid var(--color-text)', background: 'var(--color-bg)' }}>
                        <button onClick={() => setOffset((o: number) => o + 1)} style={{ padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                        <button onClick={() => setOffset((o: number) => Math.max(0, o - 1))} style={{ padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', borderLeft: '2px solid var(--color-text)' }} disabled={offset === 0}><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            <div style={{ position: 'relative', overflowX: 'auto', paddingBottom: '70px', marginTop: '10px' }}>
                <div style={{ minWidth: `${viewRange * 40}px`, height: `${chartHeight + 40}px`, position: 'relative' }}>
                    
                    {/* Y-Axis Labels */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 40, width: '40px', borderRight: '2px solid var(--color-text)' }}>
                        {Array.from({ length: yRange.max - yRange.min + 1 }).map((_, i) => {
                            const h = yRange.min + i;
                            const displayH = h >= 24 ? h - 24 : h;
                            const pos = getY(h);
                            return (
                                <div key={h} style={{ 
                                    position: 'absolute',
                                    right: '6px',
                                    bottom: `${pos}px`,
                                    transform: 'translateY(50%)',
                                    fontSize: '0.65rem', 
                                    fontWeight: 'bold', 
                                    opacity: 0.5, 
                                    textAlign: 'right'
                                }}>
                                    {displayH.toString().padStart(2, '0')}:00
                                </div>
                            );
                        })}
                    </div>

                    {/* Chart Area */}
                    <div style={{ marginLeft: '40px', height: `${chartHeight}px`, position: 'relative' }}>
                        {/* Grid lines */}
                        {Array.from({ length: yRange.max - yRange.min + 1 }).map((_, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: `${getY(yRange.min + i)}px`,
                                borderTop: '1px dashed rgba(var(--color-text-rgb), 0.1)',
                                pointerEvents: 'none'
                            }} />
                        ))}

                        {chartData.map((day: any) => (
                            <div key={day.date} style={{
                                position: 'absolute',
                                left: `${(chartData.indexOf(day) / chartData.length) * 100}%`,
                                width: `${100 / chartData.length}%`,
                                height: '100%',
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                {/* Connecting Line */}
                                {day.wake !== null && day.sleep !== null && (
                                    <div style={{
                                        position: 'absolute',
                                        left: '50%',
                                        bottom: `${getY(day.wake)}px`,
                                        width: '2px',
                                        height: `${getY(day.sleep) - getY(day.wake)}px`,
                                        background: 'var(--color-text)',
                                        opacity: 0.1,
                                        zIndex: 1
                                    }} />
                                )}

                                {/* Stacked Activities */}
                                {(() => {
                                    let currentY = day.wake || 8;
                                    const stackItems: React.ReactNode[] = [];

                                    // 1. Work Entries
                                    day.entries.forEach((entry: WorkLogEntry) => {
                                        const h = Number(entry.hours);
                                        const hStart = currentY;
                                        const hEnd = currentY + h;
                                        const color = entry.project_id ? projectColorMap[entry.project_id] || '#888' : '#888';
                                        const projectName = entry.project_id ? projects.find(p => p.id === entry.project_id)?.name : 'Geen Project';
                                        
                                        stackItems.push(
                                            <div
                                                key={`work-${entry.id}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: '15%',
                                                    right: '15%',
                                                    bottom: `${getY(hStart)}px`,
                                                    height: `${getY(hEnd) - getY(hStart)}px`,
                                                    background: color,
                                                    border: '1.5px solid var(--color-text)',
                                                    zIndex: 2,
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={() => setHoverInfo({ 
                                                    date: day.date, 
                                                    type: 'work', 
                                                    label: projectName, 
                                                    hours: h,
                                                    note: entry.note
                                                })}
                                                onMouseLeave={() => setHoverInfo(null)}
                                            />
                                        );
                                        currentY += h;
                                    });

                                    // Work Hour Badge (ONLY WORK)
                                    if (day.totalWorkHours > 0 && day.wake !== null) {
                                        stackItems.push(
                                            <div key="work-badge" style={{
                                                position: 'absolute',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                bottom: `${getY(day.wake + day.totalWorkHours) + 4}px`,
                                                padding: '2px 4px',
                                                background: 'var(--color-primary)',
                                                color: 'var(--color-bg)',
                                                fontSize: '0.6rem',
                                                fontWeight: '900',
                                                zIndex: 6,
                                                whiteSpace: 'nowrap',
                                                border: '1px solid var(--color-text)',
                                                pointerEvents: 'none'
                                            }}>
                                                {day.totalWorkHours.toFixed(1)}h
                                            </div>
                                        );
                                    }

                                    // 2. Other Activities (Stacked ON TOP of work)
                                    day.otherEntries.forEach((entry: OtherActivity) => {
                                        const h = Number(entry.hours);
                                        const hStart = currentY;
                                        const hEnd = currentY + h;
                                        const color = '#A0A0A0'; // Neutral grey for other activities
                                        
                                        stackItems.push(
                                            <div
                                                key={`other-${entry.id}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: '20%',
                                                    right: '20%',
                                                    bottom: `${getY(hStart)}px`,
                                                    height: `${getY(hEnd) - getY(hStart)}px`,
                                                    background: color,
                                                    border: '1.5px solid var(--color-text)',
                                                    borderStyle: 'dashed',
                                                    zIndex: 2,
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={() => setHoverInfo({ 
                                                    date: day.date, 
                                                    type: 'other', 
                                                    label: entry.label, 
                                                    hours: h,
                                                    note: entry.note
                                                })}
                                                onMouseLeave={() => setHoverInfo(null)}
                                            />
                                        );
                                        currentY += h;
                                    });

                                    return stackItems;
                                })()}

                                {/* Wake Point */}
                                {day.wake !== null && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: '50%',
                                            transform: 'translate(-50%, 50%)',
                                            bottom: `${getY(day.wake)}px`,
                                            width: '10px',
                                            height: '10px',
                                            background: 'var(--color-primary)',
                                            border: '2px solid var(--color-text)',
                                            zIndex: 5,
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={() => setHoverInfo({ date: day.date, type: 'wake', time: day.habit?.wake_time || '' })}
                                        onMouseLeave={() => setHoverInfo(null)}
                                    />
                                )}

                                {/* Sleep Point */}
                                {day.sleep !== null && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '50%',
                                                transform: 'translate(-50%, 50%)',
                                                bottom: `${getY(day.sleep)}px`,
                                                width: '10px',
                                                height: '10px',
                                                background: '#AF00FF',
                                                border: '2px solid var(--color-text)',
                                                zIndex: 5,
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={() => setHoverInfo({ date: day.date, type: 'sleep', time: day.habit?.sleep_time || '' })}
                                            onMouseLeave={() => setHoverInfo(null)}
                                        />
                                        {/* Awake Badge */}
                                        <div style={{
                                            position: 'absolute',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            bottom: `${getY(day.sleep) - 22}px`,
                                            padding: '2px 4px',
                                            background: 'var(--color-text)',
                                            color: 'var(--color-bg)',
                                            fontSize: '0.55rem',
                                            fontWeight: '900',
                                            zIndex: 6,
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none'
                                        }}>
                                            {day.awakeHours.toFixed(1)}h
                                        </div>
                                    </>
                                )}

                                {/* X-Axis Date */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-55px',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    writingMode: 'vertical-rl',
                                    textTransform: 'uppercase',
                                    textAlign: 'right',
                                    opacity: 0.6
                                }}>
                                    {day.displayDate} {day.dayName.substring(0, 3)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fixed Position Tooltip Area */}
                    {hoverInfo && (
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'var(--color-text)',
                            color: 'var(--color-bg)',
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            zIndex: 100,
                            pointerEvents: 'none',
                            border: '2px solid var(--color-primary)',
                            boxShadow: '4px 4px 0px rgba(0,0,0,0.2)',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            minWidth: '150px'
                        }}>
                            <div style={{ textTransform: 'uppercase', fontSize: '0.65rem', opacity: 0.7, marginBottom: '2px' }}>{hoverInfo.date}</div>
                            {hoverInfo.type === 'wake' && <div>Wake Up: <span style={{ color: 'var(--color-primary)' }}>{hoverInfo.time}</span></div>}
                            {hoverInfo.type === 'sleep' && <div>Sleep: <span style={{ color: '#AF00FF' }}>{hoverInfo.time}</span></div>}
                            {(hoverInfo.type === 'work' || hoverInfo.type === 'other') && (
                                <>
                                    <div style={{ marginBottom: '2px' }}>{hoverInfo.type === 'work' ? 'Project' : 'Activiteit'}: <span style={{ color: 'var(--color-primary)' }}>{hoverInfo.label}</span></div>
                                    <div style={{ marginBottom: '2px' }}>Duree: <span style={{ color: 'var(--color-primary)' }}>{hoverInfo.hours?.toFixed(1)}h</span></div>
                                    {hoverInfo.note && (
                                        <div style={{ 
                                            marginTop: '4px', 
                                            paddingTop: '4px', 
                                            borderTop: '1px solid rgba(255,255,255,0.2)', 
                                            fontSize: '0.7rem', 
                                            fontStyle: 'italic',
                                            whiteSpace: 'normal',
                                            maxWidth: '180px'
                                        }}>
                                            "{hoverInfo.note}"
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', background: 'var(--color-primary)', border: '1px solid var(--color-text)' }} /> Wake
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', background: '#AF00FF', border: '1px solid var(--color-text)' }} /> Sleep
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '8px', background: '#888', border: '1px solid var(--color-text)' }} /> Work
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '8px', background: '#A0A0A0', border: '1px dashed var(--color-text)' }} /> Andere
                </div>
            </div>
        </div>
    );
};
