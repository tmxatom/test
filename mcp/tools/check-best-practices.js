import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "your-api-key-here"
});

export async function checkBestPractices(params) {
  const { code, language, framework, strictMode = false } = params;

  try {
    const prompt = `You are a code review expert. Analyze this ${language} code for best practices.

${framework ? `Framework: ${framework}` : ""}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide analysis with:

 **What's Good**
List positive things

 **Issues Found**
- Point out problems with line numbers
- Explain why each is an issue

 **Recommendations**
- How to fix each issue
- Better practices to follow

 **Score: X/10**
Give a score and brief reason

Keep it clear and helpful!`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const analysis = response.text;

    return {
      content: [
        {
          type: "text",
          text: `##  Best Practices Analysis\n\n${analysis}\n\n---\n\n*Powered by Gemini 2.5 Flash*`,
        },
      ],
    };
  } catch (error) {
    console.error("Gemini API Error:", error);

    return {
      content: [
        {
          type: "text",
          text: ` Error: ${error.message || "Unknown error"} \n\ Wait 1 minute between requests or check your API key.`,
        },
      ],
    };
  }
}