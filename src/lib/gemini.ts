const MODEL = 'gemini-3.1-flash-lite-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface GeminiResponse {
    text: string;
    tool_calls?: any[];
    /**
     * The model's raw response parts. Gemini 3 attaches a `thoughtSignature` next to each
     * `functionCall` part; it must be echoed back verbatim in the next request's history or
     * the API rejects the call. Always push these parts into the history as-is — never rebuild
     * them from `tool_calls`.
     */
    modelParts?: any[];
    error?: string;
}

const callGemini = async (
    contents: any[],
    apiKey: string,
    systemInstruction?: string,
    tools?: any[]
): Promise<GeminiResponse> => {
    try {
        const payload: any = { contents };

        if (systemInstruction) {
            payload.systemInstruction = {
                role: 'system',
                parts: [{ text: systemInstruction }]
            };
        }

        if (tools) {
            payload.tools = tools;
        }

        const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.error) {
            return { text: '', error: data.error.message };
        }

        const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
        const text = parts.filter(p => p.text).map(p => p.text).join('');
        const tool_calls = parts.filter(p => p.functionCall).map(p => p.functionCall);

        return { text, tool_calls, modelParts: parts };
    } catch (err) {
        return { text: '', error: err instanceof Error ? err.message : 'Unknown error' };
    }
};

export const generateGeminiContent = async (
    prompt: string,
    apiKey: string,
    systemInstruction?: string,
    tools?: any[]
): Promise<GeminiResponse> => {
    return callGemini(
        [{ role: 'user', parts: [{ text: prompt }] }],
        apiKey,
        systemInstruction,
        tools
    );
};

/**
 * `history` must already contain everything: the user turn, the model turn with its untouched
 * parts (including thought signatures), and the functionResponse turn.
 */
export const continueGeminiConversation = async (
    history: any[],
    apiKey: string,
    systemInstruction?: string,
    tools?: any[]
): Promise<GeminiResponse> => {
    return callGemini(history, apiKey, systemInstruction, tools);
};
