
export interface GeminiResponse {
    text: string;
    tool_calls?: any[];
    error?: string;
}

export const generateGeminiContent = async (prompt: string, apiKey: string, systemInstruction?: string, tools?: any[]): Promise<GeminiResponse> => {
    try {
        const payload: any = {
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }]
        };

        if (systemInstruction) {
            payload.systemInstruction = {
                role: 'system',
                parts: [{ text: systemInstruction }]
            };
        }

        if (tools) {
            payload.tools = tools;
        }

        // Exact model ID provided by the user
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            return { text: '', error: data.error.message };
        }

        const candidate = data.candidates?.[0]?.content;
        const text = candidate?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('') || '';
        const tool_calls = candidate?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

        return { text, tool_calls };
    } catch (err) {
        return { text: '', error: err instanceof Error ? err.message : 'Unknown error' };
    }
};

export const respondToToolCall = async (history: any[], toolResults: any[], apiKey: string, systemInstruction?: string): Promise<GeminiResponse> => {
    try {
        const payload: any = {
            contents: [
                ...history,
                {
                    role: 'user', 
                    parts: toolResults.map(r => ({ 
                        functionResponse: { 
                            name: r.name, 
                            response: { name: r.name, content: r.content } 
                        } 
                    }))
                }
            ]
        };

        if (systemInstruction) {
            payload.systemInstruction = {
                role: 'system',
                parts: [{ text: systemInstruction }]
            };
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.error) return { text: '', error: data.error.message };

        const candidate = data.candidates?.[0]?.content;
        const text = candidate?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('') || '';
        const tool_calls = candidate?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

        return { text, tool_calls };
    } catch (err) {
        return { text: '', error: err instanceof Error ? err.message : 'Unknown error' };
    }
};
