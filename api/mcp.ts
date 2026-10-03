/**
 * MCP-server van de motivatie-app: Mate (of een andere agent) zet hier werk en slaap in.
 *
 * Streamable HTTP zonder sessie: elke POST is één JSON-RPC-bericht en krijgt één JSON-antwoord. Meer heeft een
 * client die alleen gereedschap aanroept niet nodig, en zo draait het als gewone Vercel-functie zonder geheugen.
 *
 * Inloggen gaat met de sleutel die je op de site onder "Mate" aanmaakt, als `Authorization: Bearer mate_...`. De
 * functie praat met Supabase via de publieke anon-sleutel, die de site zelf ook gebruikt; de database-functies uit
 * `supabase/migrations/20261003_mate_mcp.sql` controleren de Mate-sleutel en schrijven alleen bij die gebruiker.
 */

const PROTOCOL = '2025-06-18';
const TIJDZONE = 'Europe/Amsterdam';

type Json = Record<string, unknown>;
type RpcVerzoek = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Json };

const GEREEDSCHAP = [
    {
        name: 'projecten',
        description: 'Alle projecten van de gebruiker met id, naam, of ze gearchiveerd zijn en de uren van de laatste zeven dagen. Gebruik dit om werk bij het juiste project te zetten.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'log_werk',
        description: 'Een werksessie wegschrijven. Alleen echt werk, nooit afleiding. Geef begin en eind (ISO-tijden) of een datum met uren. Met hetzelfde extern_id wordt een eerder weggeschreven sessie bijgewerkt in plaats van dubbel gezet.',
        inputSchema: {
            type: 'object',
            properties: {
                begin: { type: 'string', description: 'ISO-tijd waarop het werk begon' },
                eind: { type: 'string', description: 'ISO-tijd waarop het werk eindigde' },
                datum: { type: 'string', description: 'yyyy-mm-dd, als je geen begin en eind geeft' },
                uren: { type: 'number', description: 'aantal uren, als je geen begin en eind geeft' },
                notitie: { type: 'string', description: 'waar aan gewerkt is, kort' },
                project_id: { type: 'string', description: 'id uit `projecten`' },
                project_naam: { type: 'string', description: 'naam van het project, als je het id niet weet' },
                extern_id: { type: 'string', description: 'eigen kenmerk van deze sessie' },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'log_slaap',
        description: 'Een nacht slaap wegschrijven: wanneer de gebruiker ging slapen en wanneer hij wakker werd (ISO-tijden). Inslapen komt bij de dag waarop hij naar bed ging, wakker worden bij de dag waarop hij opstond.',
        inputSchema: {
            type: 'object',
            properties: {
                slaap: { type: 'string', description: 'ISO-tijd van inslapen' },
                wakker: { type: 'string', description: 'ISO-tijd van wakker worden' },
            },
            required: ['slaap', 'wakker'],
            additionalProperties: false,
        },
    },
    {
        name: 'periode',
        description: 'Gewerkte uren per dag tussen twee datums (beide meegeteld), met de verdeling over projecten. Hoogstens drie maanden. Handig voor een week- of maandoverzicht.',
        inputSchema: {
            type: 'object',
            properties: {
                van: { type: 'string', description: 'yyyy-mm-dd' },
                tot: { type: 'string', description: 'yyyy-mm-dd, standaard vandaag' },
            },
            required: ['van'],
            additionalProperties: false,
        },
    },
    {
        name: 'dag',
        description: 'Wat er op een dag staat: gewerkte uren, de sessies met project en notitie, en opstaan en slapen.',
        inputSchema: {
            type: 'object',
            properties: { datum: { type: 'string', description: 'yyyy-mm-dd, standaard vandaag' } },
            additionalProperties: false,
        },
    },
];

/** Datum en tijd zoals in Nederland, want de app rekent in lokale dagen. */
function lokaal(iso: string): { datum: string; tijd: string; uur: number } {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) throw new Error(`geen geldige tijd: ${iso}`);
    const delen = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', { timeZone: TIJDZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
            .formatToParts(d)
            .map((p) => [p.type, p.value]),
    );
    return { datum: `${delen.year}-${delen.month}-${delen.day}`, tijd: `${delen.hour}:${delen.minute}`, uur: Number(delen.hour) };
}

const vandaag = () => lokaal(new Date().toISOString()).datum;

/** Inslapen na middernacht hoort bij de avond ervoor: om half twee naar bed is de nacht van gisteren. */
function slaapDatum(iso: string): string {
    const l = lokaal(iso);
    if (l.uur >= 12) return l.datum;
    return lokaal(new Date(new Date(iso).getTime() - 12 * 3_600_000).toISOString()).datum;
}

async function rpc(functie: string, args: Json): Promise<unknown> {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const sleutel = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !sleutel) throw new Error('de site mist zijn Supabase-instellingen');
    const r = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/rpc/${functie}`, {
        method: 'POST',
        headers: { apikey: sleutel, authorization: `Bearer ${sleutel}`, 'content-type': 'application/json' },
        body: JSON.stringify(args),
    });
    const tekst = await r.text();
    if (!r.ok) {
        let bericht = tekst;
        try {
            bericht = (JSON.parse(tekst) as { message?: string }).message || tekst;
        } catch {
            /* geen JSON */
        }
        throw new Error(bericht.slice(0, 300));
    }
    return tekst ? JSON.parse(tekst) : null;
}

type Project = { id: string; naam: string; gearchiveerd: boolean };

/** Een projectnaam terugvinden: exact, dan als deel van de naam, alleen bij actieve projecten. */
function vindProject(lijst: Project[], naam: string): Project | undefined {
    const n = naam.trim().toLowerCase();
    if (!n) return undefined;
    const actief = lijst.filter((p) => !p.gearchiveerd);
    return (
        actief.find((p) => p.naam.toLowerCase() === n) ??
        actief.find((p) => n.includes(p.naam.toLowerCase()) || p.naam.toLowerCase().includes(n))
    );
}

async function roepAan(naam: string, args: Json, sleutel: string): Promise<unknown> {
    const tekst = (v: unknown) => (typeof v === 'string' ? v : '');
    switch (naam) {
        case 'projecten':
            return rpc('mate_projecten', { p_sleutel: sleutel });
        case 'log_werk': {
            let datum = tekst(args.datum);
            let uren = typeof args.uren === 'number' ? args.uren : 0;
            if (tekst(args.begin) && tekst(args.eind)) {
                const ms = new Date(tekst(args.eind)).getTime() - new Date(tekst(args.begin)).getTime();
                if (!(ms > 0)) throw new Error('eind ligt niet na begin');
                uren = ms / 3_600_000;
                datum = lokaal(tekst(args.begin)).datum;
            }
            if (!datum) datum = vandaag();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error('datum als yyyy-mm-dd');
            let project = tekst(args.project_id) || null;
            let projectNaam: string | null = null;
            if (!project && tekst(args.project_naam)) {
                const p = vindProject((await rpc('mate_projecten', { p_sleutel: sleutel })) as Project[], tekst(args.project_naam));
                project = p?.id ?? null;
                projectNaam = p?.naam ?? null;
            }
            const uit = await rpc('mate_log_werk', {
                p_sleutel: sleutel,
                p_datum: datum,
                p_uren: Math.round(uren * 1000) / 1000,
                p_notitie: tekst(args.notitie) || null,
                p_project: project,
                p_extern: tekst(args.extern_id) || null,
            });
            return { ...(uit as Json), datum, uren: Math.round(uren * 100) / 100, project: projectNaam ?? project };
        }
        case 'log_slaap': {
            const slaap = tekst(args.slaap);
            const wakker = tekst(args.wakker);
            const duur = new Date(wakker).getTime() - new Date(slaap).getTime();
            if (!(duur > 0) || duur > 20 * 3_600_000) throw new Error('wakker moet na slaap liggen, binnen twintig uur');
            const w = lokaal(wakker);
            await rpc('mate_log_slaap', {
                p_sleutel: sleutel,
                p_slaap_datum: slaapDatum(slaap),
                p_slaap_tijd: lokaal(slaap).tijd,
                p_wakker_datum: w.datum,
                p_wakker_tijd: w.tijd,
            });
            return { ok: true, slapen: `${slaapDatum(slaap)} ${lokaal(slaap).tijd}`, opstaan: `${w.datum} ${w.tijd}`, uren: Math.round((duur / 3_600_000) * 10) / 10 };
        }
        case 'dag':
            return rpc('mate_dag', { p_sleutel: sleutel, p_datum: tekst(args.datum) || vandaag() });
        case 'periode': {
            const van = tekst(args.van);
            const tot = tekst(args.tot) || vandaag();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(van) || !/^\d{4}-\d{2}-\d{2}$/.test(tot)) throw new Error('datums als yyyy-mm-dd');
            return rpc('mate_periode', { p_sleutel: sleutel, p_van: van, p_tot: tot });
        }
        default:
            throw new Error(`onbekend gereedschap: ${naam}`);
    }
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const fout = (id: RpcVerzoek['id'], code: number, bericht: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message: bericht } });

async function beantwoord(v: RpcVerzoek, sleutel: string): Promise<unknown | null> {
    // Een melding (geen id) krijgt geen antwoord.
    if (v.id === undefined || v.id === null) return null;
    switch (v.method) {
        case 'initialize': {
            const gevraagd = typeof v.params?.protocolVersion === 'string' ? v.params.protocolVersion : PROTOCOL;
            return {
                jsonrpc: '2.0',
                id: v.id,
                result: {
                    protocolVersion: gevraagd,
                    capabilities: { tools: { listChanged: false } },
                    serverInfo: { name: 'motivatie', version: '1.0.0' },
                    instructions: 'Werk en slaap van de gebruiker in zijn motivatie-app. Schrijf alleen echt werk weg, nooit afleiding.',
                },
            };
        }
        case 'ping':
            return { jsonrpc: '2.0', id: v.id, result: {} };
        case 'tools/list':
            return { jsonrpc: '2.0', id: v.id, result: { tools: GEREEDSCHAP } };
        case 'tools/call': {
            const naam = typeof v.params?.name === 'string' ? v.params.name : '';
            const args = (v.params?.arguments as Json) ?? {};
            try {
                const uit = await roepAan(naam, args, sleutel);
                return { jsonrpc: '2.0', id: v.id, result: { content: [{ type: 'text', text: JSON.stringify(uit) }], structuredContent: { resultaat: uit } } };
            } catch (e) {
                return { jsonrpc: '2.0', id: v.id, result: { isError: true, content: [{ type: 'text', text: e instanceof Error ? e.message : String(e) }] } };
            }
        }
        default:
            return fout(v.id, -32601, `onbekende methode: ${v.method}`);
    }
}

export async function POST(request: Request): Promise<Response> {
    const sleutel = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!/^mate_[0-9a-f]{48}$/.test(sleutel)) {
        return json(fout(null, -32001, 'maak op de site onder "Mate" een sleutel en stuur die mee als Bearer'), 401);
    }
    let invoer: RpcVerzoek | RpcVerzoek[];
    try {
        invoer = (await request.json()) as RpcVerzoek | RpcVerzoek[];
    } catch {
        return json(fout(null, -32700, 'geen geldige JSON'), 400);
    }
    if (Array.isArray(invoer)) {
        const antwoorden = (await Promise.all(invoer.map((v) => beantwoord(v, sleutel)))).filter((a) => a !== null);
        return antwoorden.length ? json(antwoorden) : new Response(null, { status: 202 });
    }
    const antwoord = await beantwoord(invoer, sleutel);
    return antwoord === null ? new Response(null, { status: 202 }) : json(antwoord);
}

/** Geen stroom van de server naar de client: wie hier met GET luistert, krijgt dat netjes te horen. */
export function GET(): Response {
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
}

export function DELETE(): Response {
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
}
