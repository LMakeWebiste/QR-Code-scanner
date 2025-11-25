import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

// We do not instantiate globally to prevent startup crashes if key is missing
let genAIInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!genAIInstance) {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey.includes("your_google_api_key")) {
      console.warn("API Key is missing or invalid.");
      // We allow it to return null or throw to be handled in the function
    }
    // Even if key is missing, we try to init, but the call will fail later gracefully
    genAIInstance = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return genAIInstance;
};

export const analyzeQRContent = async (content: string, format?: string): Promise<AnalysisResult> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
        return {
            safety: "unknown",
            category: "Configuration Error",
            summary: "API Key is missing. Please add VITE_API_KEY to your .env file or GitHub Secrets.",
        };
    }

    const ai = getAI();
    if (!ai) throw new Error("Could not initialize AI");

    const prompt = `
      You are an advanced scanner assistant using Google Search.
      
      TASK:
      1. Search Google for this data: "${content}" (Format: ${format || 'Unknown'}).
      2. If it is a PRODUCT (UPC, EAN, ISBN, etc.), find the EXACT product name, brand, and key details (price, specs).
      3. If it is a URL/Website, verify if it is safe or malicious.
      4. If it is plain text, explain what it refers to.

      OUTPUT:
      Return a JSON object (do not use markdown formatting) with the following structure:
      {
        "safety": "safe" | "caution" | "danger" | "unknown",
        "category": "String (e.g. Grocery, Book, Electronics, Website)",
        "summary": "String (A brief summary of what was found)",
        "productName": "String (The exact product name if found)",
        "productDetails": "String (Extra details like price, weight, or author)"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType cannot be used simultaneously with tools in this version
      },
    });

    let text = response.text || "{}";
    // Sanitize: sometimes models wrap JSON in markdown blocks
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let result: AnalysisResult;
    try {
        result = JSON.parse(text);
    } catch (e) {
        console.warn("Gemini returned non-JSON text, using fallback.", text);
        result = {
            safety: 'unknown',
            category: 'Search Result',
            summary: response.text?.substring(0, 150) + '...' || 'No description available.',
            productName: 'Detected Item'
        };
    }

    // Extract Google Search Sources (Grounding Metadata)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => {
        if (chunk.web) {
            return { title: chunk.web.title || 'Web Source', uri: chunk.web.uri };
        }
        return null;
    }).filter((s: any) => s !== null && s.uri) || [];

    return { ...result, sources };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      safety: "unknown",
      category: "Unknown",
      summary: "Could not perform online search. Check connection or API quota.",
    };
  }
};