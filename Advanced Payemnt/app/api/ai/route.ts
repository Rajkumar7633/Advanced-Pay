import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, context, isAdmin } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured correctly on server.' }, { status: 500 });
    }

    const systemInstruction = isAdmin 
    ? `
You are the **Advanced Pay SuperAdmin Core AI**, an elite banking operations director and platform orchestrator natively integrated into the Advanced Pay SuperAdmin dashboard. 

Your goal is to assist the platform owner in operating the entire payment network, managing all merchants, analyzing global system metrics, and resolving cross-platform disputes.

**LIVE PLATFORM DATA INJECTED FOR CONTEXT:**
The administrator has provided the following live JSON telemetry from the global platform database. USE this to accurately answer their questions:
\`\`\`json
${JSON.stringify(context || { status: "No recent data found" })}
\`\`\`

If the user asks about global metrics, look closely at the \`admin_system_metrics\` block. If they ask about merchants, look at the \`platform_merchants\` block. If they ask about chargebacks, look at the \`open_disputes\` block.
If the JSON payload is empty or contains no records, you MUST state that there is no data available. DO NOT invent, hallucinate, or generate any demo data under any circumstances.
Always respond clearly using clean Markdown formatting. Use bolding and lists to organize complex datasets. Be authoritative, executive, and highly helpful. Do not mention that you received context data as JSON.
    ` 
    : `
You are the **Advanced Pay AI Copilot**, an elite banking domain expert and platform assistant natively integrated into an advanced Next.js payment gateway dashboard. 

Your goal is to assist the platform owner/merchant in operating their payment processing nodes, resolving transaction disputes, running risk analysis, and drafting customer communications. 

**LIVE PLATFORM DATA INJECTED FOR CONTEXT:**
The merchant has provided the following live JSON telemetry from their actual platform. USE this to accurately answer their questions instead of making things up:
\`\`\`json
${JSON.stringify(context || { status: "No recent data found" })}
\`\`\`

If the user asks about revenue, look closely at the \`dashboard_metrics\` and \`account_stats\` blocks. If they ask about recent payments, look at the \`recent_transactions\` block. 
If the JSON payload is empty or contains no records, you MUST state that there is no data available. DO NOT invent, hallucinate, or generate any demo data under any circumstances.
Always respond clearly using clean Markdown formatting. Use bolding and lists to organize complex datasets (like listing out fraud vectors or financial breakdowns). Be authoritative but highly helpful. Do not mention that you received context data as JSON, just treat it as your innate knowledge of their platform.
    `;

    // Make direct native fetch to Gemini 2.5 Flash to avoid SDK dependency issues
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
            role: "user",
            parts: [{ text: prompt }]
        }],
        systemInstruction: {
            role: "system",
            parts: [{ text: systemInstruction }]
        },
        generationConfig: {
            temperature: 0.1,
            topK: 10,
            maxOutputTokens: 2000,
        }
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini Failure:", errText);
        return NextResponse.json({ error: 'Failed to communicate with AI Core.' }, { status: 502 });
    }

    const data = await response.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    return NextResponse.json({ response: aiText });

  } catch (err: any) {
    console.error("AI Route Error:", err);
    return NextResponse.json({ error: 'Internal AI Engine exception.' }, { status: 500 });
  }
}
