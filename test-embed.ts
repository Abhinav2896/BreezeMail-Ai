import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config();

async function main() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = ai.getGenerativeModel({ model: "text-embedding-004" });
  
  const result = await model.embedContent("Hello world");
  const embedding = result.embedding;
  console.log("Vector length:", embedding.values.length);
  console.log("First few values:", embedding.values.slice(0, 5));
}

main().catch(console.error);