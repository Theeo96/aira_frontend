import { GoogleGenAI } from "@google/genai";
import { PERSONA_DATA } from "../constants";
import { Persona } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIResponse = async (prompt: string, personas: Persona[]) => {
  try {
    const systemInstruction = personas
      .map((p) => PERSONA_DATA[p].instruction)
      .join("\n\n");

    // Correct usage of ai.models.generateContent and extracting .text property
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      },
    });

    return response.text || "죄송해요, 다시 말씀해 주시겠어요?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "연결에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
};
