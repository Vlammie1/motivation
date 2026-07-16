export const MS_PER_HOUR = 3600000;

/** "02:34:07" — voor de lopende timer. */
export const formatClock = (ms: number): string => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
};

/** "2u 34m" — voor uren als decimaal getal. */
export const formatHours = (hours: number): string => {
    if (hours <= 0) return '0m';
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}u`;
    return `${h}u ${m}m`;
};

/** Lokale datum als yyyy-mm-dd. new Date().toISOString() pakt UTC en zet
 *  late-avondsessies op de verkeerde dag. */
export const localDateKey = (date: Date = new Date()): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
