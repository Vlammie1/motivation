import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { differenceInDays, startOfYear } from 'date-fns';
import { Settings, Save, X } from 'lucide-react';

interface GrindEfficiencyProps {
    totalYearHours: number;
}

export const GrindEfficiency: React.FC<GrindEfficiencyProps> = ({ totalYearHours }) => {
    const [sleep, setSleep] = useLocalStorage<number>('grind-config-sleep', 8);
    const [cantWork, setCantWork] = useLocalStorage<number>('grind-config-cant', 2);
    const [isEditing, setIsEditing] = useState(false);

    const [tempSleep, setTempSleep] = useState(sleep);
    const [tempCant, setTempCant] = useState(cantWork);

    const handleEdit = () => {
        setTempSleep(sleep);
        setTempCant(cantWork);
        setIsEditing(true);
    };

    const handleSave = () => {
        setSleep(tempSleep);
        setCantWork(tempCant);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const now = new Date();
    const daysPassed = differenceInDays(now, startOfYear(now)) + 1;
    const potentialPerDay = Math.max(0, 24 - sleep - cantWork);
    const potentialTotal = daysPassed * potentialPerDay;
    const efficiency = potentialTotal > 0 ? (totalYearHours / potentialTotal) * 100 : 0;

    return (
        <div style={{
            marginTop: 'var(--spacing-lg)',
            paddingTop: 'var(--spacing-lg)',
            borderTop: '1px solid var(--color-border)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>True Grind %</h3>
                {!isEditing ? (
                    <button
                        onClick={handleEdit}
                        title="Aannames aanpassen"
                        style={{
                            display: 'flex',
                            border: 'none',
                            background: 'none',
                            boxShadow: 'none',
                            color: 'var(--color-text-muted)',
                            padding: 'var(--spacing-2xs)'
                        }}
                    >
                        <Settings size={15} />
                    </button>
                ) : null}
            </div>

            {isEditing ? (
                <div style={{
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    alignItems: 'flex-end',
                    marginBottom: 'var(--spacing-md)',
                    padding: 'var(--spacing-sm)',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <label className="label" htmlFor="grind-sleep">Slaap (uren)</label>
                        <input
                            id="grind-sleep"
                            type="number"
                            value={tempSleep}
                            onChange={(e) => setTempSleep(parseFloat(e.target.value) || 0)}
                            style={{ width: '84px' }}
                        />
                    </div>
                    <div>
                        <label className="label" htmlFor="grind-nonwork">Niet-werk (uren)</label>
                        <input
                            id="grind-nonwork"
                            type="number"
                            value={tempCant}
                            onChange={(e) => setTempCant(parseFloat(e.target.value) || 0)}
                            style={{ width: '84px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2xs)' }}>
                        <button onClick={handleSave} className="btn-primary" title="Opslaan" style={{ display: 'flex', padding: 'var(--spacing-xs)' }}>
                            <Save size={15} />
                        </button>
                        <button onClick={handleCancel} title="Annuleren" style={{ display: 'flex', padding: 'var(--spacing-xs)' }}>
                            <X size={15} />
                        </button>
                    </div>
                </div>
            ) : null}

            <div style={{
                height: '8px',
                background: 'var(--color-muted)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: `${Math.min(100, efficiency)}%`,
                    background: 'var(--color-primary)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.8s cubic-bezier(0.2, 0, 0.2, 1)'
                }} />
            </div>

            <div style={{
                marginTop: 'var(--spacing-xs)',
                fontSize: 'var(--text-xs)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 'var(--spacing-sm)'
            }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)' }}>
                    {efficiency.toFixed(1)}%
                </span>
                <span className="muted">
                    {totalYearHours} van {potentialTotal} mogelijke uren
                </span>
            </div>
        </div>
    );
};
