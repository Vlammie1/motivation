import React, { useState, useMemo } from 'react';
import type { WorkHours } from '../types/work';
import { format, subDays, eachDayOfInterval, startOfDay, parseISO, startOfYear, differenceInDays, endOfYear, getDay } from 'date-fns';
import { BarChart3, Award, Zap, Calendar, ChevronLeft, ChevronRight, TrendingUp, Activity } from 'lucide-react';

interface WorkAnalyticsProps {
    workHours: WorkHours;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WorkAnalytics: React.FC<WorkAnalyticsProps> = ({ workHours }) => {
    const [viewRange, setViewRange] = useState(14); // 7, 14, 28 days
    const [offset, setOffset] = useState(0); // Offset in units of viewRange
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [lineRange, setLineRange] = useState(7);
    const [lineOffset, setLineOffset] = useState(0);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    // 1. Get available years from data
    const availableYears = useMemo(() => {
        const years = new Set<number>([new Date().getFullYear()]);
        Object.keys(workHours).forEach(date => {
            try {
                years.add(parseISO(date).getFullYear());
            } catch (e) {
                console.error("Invalid date in workHours:", date);
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [workHours]);

    // 2. Prepare data for the chart based on range and offset
    const chartData = useMemo(() => {
        // We use a fixed reference point to avoid shifting during the day
        const end = subDays(startOfDay(new Date()), offset * viewRange);
        const start = subDays(end, viewRange - 1);

        return eachDayOfInterval({ start, end }).map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            return {
                date: dateStr,
                displayDate: format(date, 'dd/MM'),
                hours: workHours[dateStr] || 0,
                // Robust day name getting using getDay index
                dayName: DAY_NAMES[getDay(date)]
            };
        });
    }, [workHours, viewRange, offset]);

    const lineChartData = useMemo(() => {
        const end = subDays(startOfDay(new Date()), lineOffset * lineRange);
        const start = subDays(end, lineRange - 1);
        return eachDayOfInterval({ start, end }).map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            return {
                date: dateStr,
                displayDate: format(date, 'MMM dd'),
                dayName: DAY_NAMES[getDay(date)],
                hours: workHours[dateStr] || 0,
            };
        });
    }, [workHours, lineRange, lineOffset]);

    // Fixed Y-axis max based on all-time data so scale never shifts between periods
    const lineChartGlobalMax = useMemo(() => {
        const allMax = Math.max(...Object.values(workHours), 2);
        return Math.ceil(allMax / 2) * 2;
    }, [workHours]);


    const maxHoursInView = Math.max(...chartData.map(d => d.hours), 1);
    const chartHeight = 350; // Maximum height for premium feel

    // 3. Extra Statistics Calculations (Filtered by selected year)
    const stats = useMemo(() => {
        const yearLogs = Object.entries(workHours).filter(([date]) =>
            parseISO(date).getFullYear() === selectedYear
        );

        const totalHours = yearLogs.reduce((acc, [_, h]) => acc + h, 0);

        // Day of week stats - Robust calculation
        const dayOfWeekTotals: Record<string, { total: number, count: number }> = {};
        DAY_NAMES.forEach(d => {
            dayOfWeekTotals[d] = { total: 0, count: 0 };
        });

        yearLogs.forEach(([date, hours]) => {
            const d = parseISO(date);
            const dayName = DAY_NAMES[getDay(d)];
            if (dayOfWeekTotals[dayName]) {
                dayOfWeekTotals[dayName].total += hours;
                dayOfWeekTotals[dayName].count += 1;
            }
        });

        const bestDayEntry = Object.entries(dayOfWeekTotals)
            .filter(([_, data]) => data.count > 0)
            .map(([name, data]) => ({ name, avg: data.total / data.count }))
            .sort((a, b) => b.avg - a.avg)[0];

        // All-time high with date (Overall, not just selected year)
        const allTimeHighEntry = Object.entries(workHours)
            .sort((a, b) => b[1] - a[1])[0];

        // Projection logic
        const now = new Date();
        const yearStart = startOfYear(new Date(selectedYear, 0, 1));
        const yearEnd = endOfYear(yearStart);

        let daysPassedInYear;
        if (selectedYear < now.getFullYear()) {
            daysPassedInYear = differenceInDays(yearEnd, yearStart) + 1;
        } else if (selectedYear > now.getFullYear()) {
            daysPassedInYear = 0;
        } else {
            daysPassedInYear = Math.max(1, differenceInDays(now, yearStart) + 1);
        }

        const averagePerDay = daysPassedInYear > 0 ? totalHours / daysPassedInYear : 0;
        const projectedYearTotal = averagePerDay * 365;

        // Based on 10h/day ideal
        const potentialHoursToDate = daysPassedInYear * 10;
        const grindPercentage = potentialHoursToDate > 0 ? (totalHours / potentialHoursToDate) * 100 : 0;
        const projectedGrindPercentage = (projectedYearTotal / (365 * 10)) * 100;

        return {
            totalHours,
            bestDay: bestDayEntry || null,
            allTimeHigh: allTimeHighEntry ? { hours: allTimeHighEntry[1], date: allTimeHighEntry[0] } : null,
            projectedYearTotal,
            averagePerDay,
            grindPercentage,
            projectedGrindPercentage
        };
    }, [workHours, selectedYear]);

    return (
        <section style={{
            marginTop: 'var(--spacing-xl)',
            border: 'var(--brutalist-border)',
            padding: 'var(--spacing-lg)',
            background: 'var(--color-bg)',
            boxShadow: 'var(--brutalist-shadow)'
        }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <BarChart3 size={24} color="var(--color-primary)" />
                    <h2 style={{ textTransform: 'uppercase', margin: 0 }}>Advanced Grind Analytics</h2>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{ padding: '6px 12px', border: '3px solid var(--color-text)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', background: 'var(--color-bg)', cursor: 'pointer' }}
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <div style={{ display: 'flex', border: '3px solid var(--color-text)', background: 'var(--color-bg)' }}>
                        {[7, 14, 28].map(r => (
                            <button
                                key={r}
                                onClick={() => { setViewRange(r); setOffset(0); }}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    background: viewRange === r ? 'var(--color-text)' : 'transparent',
                                    color: viewRange === r ? 'var(--color-bg)' : 'var(--color-text)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    fontSize: '0.8rem'
                                }}
                            >
                                {r / 7}W
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', border: '3px solid var(--color-text)', background: 'var(--color-bg)' }}>
                        <button onClick={() => setOffset(o => o + 1)} style={{ padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer' }} title="Previous Range"><ChevronLeft size={20} /></button>
                        <button onClick={() => setOffset(o => Math.max(0, o - 1))} style={{ padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderLeft: '3px solid var(--color-text)' }} disabled={offset === 0} title="Next Range"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Range Indicator */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', margin: 'var(--spacing-md) 0', textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px' }}>
                {chartData[0].displayDate} - {chartData[chartData.length - 1].displayDate} ({viewRange} DAYS)
            </div>

            {/* Bar Chart */}
            <div style={{
                marginBottom: 'var(--spacing-xl)',
                overflowX: 'auto',
                paddingBottom: '50px',
                paddingTop: '40px',
                marginTop: 'var(--spacing-md)',
                background: 'rgba(var(--color-text-rgb), 0.03)',
                padding: '40px 10px 60px 10px',
                border: '2px solid rgba(var(--color-text-rgb), 0.1)'
            }}>
                <div style={{
                    minWidth: `${viewRange * 38}px`,
                    height: `${chartHeight}px`,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '4px',
                    padding: '0 20px',
                    borderLeft: '5px solid var(--color-text)',
                    borderBottom: '5px solid var(--color-text)',
                    position: 'relative'
                }}>
                    {/* Grid Lines */}
                    {[0.25, 0.5, 0.75, 1].map(p => (
                        <div key={p} style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: `${p * (chartHeight - 40)}px`,
                            borderTop: '1px dashed rgba(var(--color-text-rgb), 0.1)',
                            pointerEvents: 'none'
                        }} />
                    ))}

                    {chartData.map((day) => (
                        <div key={day.date} style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                            position: 'relative',
                            minWidth: '25px'
                        }}>
                            <div style={{
                                width: '100%',
                                background:
                                    day.hours >= 14 ? '#00FFFF' : // God Tier (Cyan)
                                        day.hours >= 13 ? '#AF00FF' : // Zenith (Purple)
                                            day.hours >= 12 ? '#FF0055' : // Overdrive (Crimson)
                                                day.hours >= 11 ? '#FF8C00' : // Ignite (Orange)
                                                    day.hours >= 10 ? '#FFD700' : // Legendary (Gold)
                                                        (day.hours > 0 ? 'var(--color-primary)' : 'rgba(128,128,128,0.1)'),
                                height: `${(day.hours / Math.max(maxHoursInView, 1)) * (chartHeight - 40)}px`,
                                border: '3px solid var(--color-text)',
                                borderBottom: 'none',
                                position: 'relative',
                                transition: 'height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}>
                                {day.hours > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-32px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: '0.7rem',
                                        fontWeight: '900',
                                        whiteSpace: 'nowrap',
                                        background:
                                            day.hours >= 14 ? '#00FFFF' :
                                                day.hours >= 13 ? '#AF00FF' :
                                                    day.hours >= 12 ? '#FF0055' :
                                                        day.hours >= 11 ? '#FF8C00' :
                                                            day.hours >= 10 ? '#FFD700' :
                                                                'var(--color-text)',
                                        color: day.hours >= 10 ? 'black' : 'var(--color-bg)',
                                        padding: '2px 6px',
                                        zIndex: 10,
                                        boxShadow: '3px 3px 0px rgba(0,0,0,0.3)',
                                        borderRadius: '0'
                                    }}>
                                        {day.hours.toFixed(1)}h
                                    </div>
                                )}
                            </div>
                            <div style={{
                                position: 'absolute',
                                bottom: '-55px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                writingMode: 'vertical-rl',
                                textTransform: 'uppercase',
                                textAlign: 'right',
                                color: day.dayName === 'Sunday' || day.dayName === 'Saturday' ? 'var(--color-primary)' : 'var(--color-text)',
                                opacity: 0.9
                            }}>
                                {day.displayDate} {day.dayName.substring(0, 3)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Line Chart */}
            {(() => {
                const SVG_W = 700;
                const SVG_H = 220;
                const PAD = { top: 24, right: 28, bottom: 48, left: 46 };
                const cW = SVG_W - PAD.left - PAD.right;
                const cH = SVG_H - PAD.top - PAD.bottom;
                const n = lineChartData.length;

                const maxH = lineChartGlobalMax;

                const getX = (i: number) => PAD.left + (n > 1 ? i * cW / (n - 1) : cW / 2);
                const getY = (h: number) => PAD.top + (1 - h / maxH) * cH;

                // Smooth cubic bezier: midpoint control points
                const points = lineChartData.map((d, i) => ({ x: getX(i), y: getY(d.hours) }));
                const buildSmooth = (pts: { x: number; y: number }[]) => {
                    if (pts.length === 0) return '';
                    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
                    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                        const mx = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
                        d += ` C ${mx},${pts[i].y.toFixed(1)} ${mx},${pts[i + 1].y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
                    }
                    return d;
                };
                const pathD = buildSmooth(points);
                const bottomY = (PAD.top + cH).toFixed(1);
                const areaD = `${pathD} L ${getX(n - 1).toFixed(1)},${bottomY} L ${getX(0).toFixed(1)},${bottomY} Z`;

                // Y-axis ticks: 0, max/2, max (and max/4, 3max/4 if space)
                const yTicks: number[] = [];
                const tickStep = maxH <= 4 ? 1 : maxH <= 8 ? 2 : maxH <= 16 ? 4 : 6;
                for (let v = 0; v <= maxH; v += tickStep) yTicks.push(v);

                const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const svgX = (e.clientX - rect.left) * (SVG_W / rect.width);
                    const step = n > 1 ? cW / (n - 1) : 1;
                    const idx = Math.round((svgX - PAD.left) / step);
                    setHoveredIdx(Math.max(0, Math.min(n - 1, idx)));
                };

                const labelStep = Math.max(1, Math.ceil(n / 8));
                const gradId = 'lcGrad';

                return (
                    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                        {/* Header + controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <Activity size={20} color="var(--color-primary)" />
                                <span style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>Hours Over Time</span>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', border: '3px solid var(--color-text)', background: 'var(--color-bg)' }}>
                                    {[{ label: '1W', value: 7 }, { label: '2W', value: 14 }, { label: '1M', value: 30 }].map(({ label, value }) => (
                                        <button
                                            key={value}
                                            onClick={() => { setLineRange(value); setLineOffset(0); setHoveredIdx(null); }}
                                            style={{
                                                padding: '6px 12px', border: 'none',
                                                background: lineRange === value ? 'var(--color-text)' : 'transparent',
                                                color: lineRange === value ? 'var(--color-bg)' : 'var(--color-text)',
                                                fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.8rem'
                                            }}
                                        >{label}</button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', border: '3px solid var(--color-text)', background: 'var(--color-bg)' }}>
                                    <button onClick={() => { setLineOffset(o => o + 1); setHoveredIdx(null); }} style={{ padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer' }} title="Previous period"><ChevronLeft size={20} /></button>
                                    <button onClick={() => { setLineOffset(o => Math.max(0, o - 1)); setHoveredIdx(null); }} style={{ padding: '6px 12px', border: 'none', borderLeft: '3px solid var(--color-text)', background: 'transparent', cursor: 'pointer' }} disabled={lineOffset === 0} title="Next period"><ChevronRight size={20} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Period label */}
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 'var(--spacing-sm)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px', opacity: 0.7 }}>
                            {lineChartData[0]?.displayDate} – {lineChartData[lineChartData.length - 1]?.displayDate}
                        </div>

                        <div style={{ background: 'rgba(var(--color-text-rgb), 0.02)', border: '2px solid rgba(var(--color-text-rgb), 0.08)', padding: '12px 8px 8px 8px', borderRadius: '0' }}>
                            <svg
                                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                                style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair', overflow: 'visible' }}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={() => setHoveredIdx(null)}
                            >
                                <defs>
                                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
                                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.01" />
                                    </linearGradient>
                                </defs>

                                {/* Horizontal reference lines */}
                                {yTicks.map(v => {
                                    const y = getY(v);
                                    return (
                                        <g key={v}>
                                            <line
                                                x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
                                                stroke="var(--color-text)"
                                                strokeOpacity={v === 0 ? 0 : 0.1}
                                                strokeWidth="1"
                                                strokeDasharray={v === 0 ? undefined : '5,5'}
                                            />
                                            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fontWeight="700" fill="var(--color-text)" fillOpacity="0.4">
                                                {v}h
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Axes */}
                                <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH} stroke="var(--color-text)" strokeWidth="2.5" strokeOpacity="0.6" />
                                <line x1={PAD.left} y1={PAD.top + cH} x2={PAD.left + cW} y2={PAD.top + cH} stroke="var(--color-text)" strokeWidth="2.5" strokeOpacity="0.6" />

                                {/* Area fill */}
                                <path d={areaD} fill={`url(#${gradId})`} />

                                {/* Smooth line */}
                                <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

                                {/* X-axis labels */}
                                {lineChartData.map((d, i) => {
                                    if (i % labelStep !== 0 && i !== n - 1) return null;
                                    return (
                                        <text key={i} x={getX(i)} y={PAD.top + cH + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-text)" fillOpacity="0.55">
                                            {d.displayDate}
                                        </text>
                                    );
                                })}

                                {/* Data point dots (only for days with hours) */}
                                {lineChartData.map((d, i) => {
                                    if (d.hours === 0 && hoveredIdx !== i) return null;
                                    return (
                                        <circle key={i}
                                            cx={getX(i)} cy={getY(d.hours)} r={hoveredIdx === i ? 5 : 3}
                                            fill={hoveredIdx === i ? 'var(--color-primary)' : 'var(--color-bg)'}
                                            stroke="var(--color-primary)" strokeWidth="2"
                                        />
                                    );
                                })}

                                {/* Hover elements */}
                                {hoveredIdx !== null && (() => {
                                    const d = lineChartData[hoveredIdx];
                                    const x = getX(hoveredIdx);
                                    const y = getY(d.hours);
                                    const tW = 112;
                                    const tH = 54;
                                    const tX = x + tW + 14 > SVG_W - PAD.right ? x - tW - 10 : x + 10;
                                    const tY = Math.max(PAD.top, Math.min(y - tH / 2, PAD.top + cH - tH));
                                    return (
                                        <>
                                            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + cH}
                                                stroke="var(--color-text)" strokeWidth="1" strokeDasharray="4,3" strokeOpacity="0.35" />
                                            <circle cx={x} cy={y} r={5}
                                                fill="var(--color-primary)" stroke="var(--color-bg)" strokeWidth="2.5" />
                                            <rect x={tX} y={tY} width={tW} height={tH} fill="var(--color-text)" />
                                            <text x={tX + 9} y={tY + 17} fontSize="10" fontWeight="700" fill="var(--color-bg)" fillOpacity="0.75">
                                                {d.displayDate} · {d.dayName.substring(0, 3).toUpperCase()}
                                            </text>
                                            <text x={tX + 9} y={tY + 41} fontSize="20" fontWeight="900" fill="var(--color-bg)">
                                                {d.hours.toFixed(1)}h
                                            </text>
                                        </>
                                    );
                                })()}
                            </svg>
                        </div>
                    </div>
                );
            })()}

            {/* Extra Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 'var(--spacing-lg)',
                marginTop: 'var(--spacing-xl)'
            }}>
                <div style={{ border: 'var(--brutalist-border)', padding: 'var(--spacing-md)', background: 'var(--color-bg)', boxShadow: '6px 6px 0px var(--color-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Calendar size={20} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>YEARLY PROGRESS ({selectedYear})</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>{stats.totalHours.toFixed(1)} <small style={{ fontSize: '1rem', opacity: 0.6 }}>HRS</small></div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>
                            <span>GRIND LEVEL: {stats.grindPercentage.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: '16px', background: 'rgba(0,0,0,0.2)', border: '3px solid var(--color-text)' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, stats.grindPercentage)}%`, background: 'var(--color-primary)' }} />
                        </div>
                    </div>
                </div>

                <div style={{ border: 'var(--brutalist-border)', padding: 'var(--spacing-md)', background: 'var(--color-bg)', boxShadow: '6px 6px 0px var(--color-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <TrendingUp size={20} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>PROJECTED YEAR END</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>{stats.projectedYearTotal.toFixed(0)} <small style={{ fontSize: '1rem', opacity: 0.6 }}>HRS</small></div>
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>
                            <span>EST. YEARLY GRIND: {stats.projectedGrindPercentage.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: '16px', background: 'rgba(0,0,0,0.2)', border: '3px solid var(--color-text)' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, stats.projectedGrindPercentage)}%`, background: '#FFD700' }} />
                        </div>
                    </div>
                </div>

                <div style={{ border: 'var(--brutalist-border)', padding: 'var(--spacing-md)', background: 'var(--color-bg)', boxShadow: '6px 6px 0px var(--color-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Award size={20} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>MOST EFFICIENT DAY</span>
                    </div>
                    <div style={{ fontSize: '2.2rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>{stats.bestDay ? stats.bestDay.name : 'N/A'}</div>
                    <p style={{ fontSize: '0.9rem', margin: '8px 0 0 0', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        AVERAGE: <span style={{ color: 'var(--color-primary)' }}>{stats.bestDay ? stats.bestDay.avg.toFixed(1) : 0} HRS</span> / SESSION
                    </p>
                </div>

                <div style={{ border: 'var(--brutalist-border)', padding: 'var(--spacing-md)', background: 'var(--color-bg)', boxShadow: '6px 6px 0px var(--color-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Zap size={20} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>ALL-TIME HIGH</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>
                        {stats.allTimeHigh?.hours || 0} <small style={{ fontSize: '1rem', opacity: 0.6 }}>HRS</small>
                    </div>
                    <p style={{ fontSize: '0.8rem', margin: '8px 0 0 0', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                        RECORD ON {stats.allTimeHigh ? stats.allTimeHigh.date : 'N/A'}
                    </p>
                </div>
            </div>

            <div style={{
                marginTop: 'var(--spacing-xl)',
                padding: 'var(--spacing-md)',
                background: 'var(--color-text)',
                color: 'var(--color-bg)',
                textAlign: 'center',
                fontWeight: '900',
                textTransform: 'uppercase',
                fontSize: '1.4rem',
                letterSpacing: '4px',
                boxShadow: '8px 8px 0px var(--color-primary)'
            }}>
                DATA REVEALS TRUTH. NUMBERS DON'T LIE.
            </div>
        </section>
    );
};
