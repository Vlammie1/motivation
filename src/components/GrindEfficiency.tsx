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
            border: 'var(--brutalist-border)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg)',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                <h3 style={{ textTransform: 'uppercase', margin: 0, fontSize: '1rem' }}>True Grind %</h3>
                {!isEditing ? (
                    <button onClick={handleEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Settings size={16} />
                    </button>
                ) : null}
            </div>

            {isEditing ? (
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-end', marginBottom: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold' }}>SLEEP (HRS)</label>
                        <input
                            type="number"
                            value={tempSleep}
                            onChange={(e) => setTempSleep(parseFloat(e.target.value) || 0)}
                            style={{ width: '80px', padding: '4px', fontFamily: 'var(--font-mono)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold' }}>NON-WORK (HRS)</label>
                        <input
                            type="number"
                            value={tempCant}
                            onChange={(e) => setTempCant(parseFloat(e.target.value) || 0)}
                            style={{ width: '80px', padding: '4px', fontFamily: 'var(--font-mono)' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={handleSave} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
                            <Save size={16} />
                        </button>
                        <button onClick={handleCancel} style={{ background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ) : null}

            <div style={{
                height: '40px',
                background: '#333',
                width: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${Math.min(100, efficiency)}%`,
                    background: 'var(--color-primary)',
                    transition: 'width 1s ease-out'
                }} />
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: 'white',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.2rem',
                    textShadow: '1px 1px 0 #000'
                }}>
                    {efficiency.toFixed(1)}% ON THE GRIND
                </div>
            </div>

            <div style={{
                marginTop: 'var(--spacing-xs)',
                fontSize: '0.7rem',
                opacity: 0.7,
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>POTENTIAL: {potentialTotal} HRS</span>
                <span>ACTUAL: {totalYearHours} HRS</span>
            </div>
        </div>
    );
};
