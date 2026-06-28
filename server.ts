/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables.");
}

/**
 * Helper to call Gemini with retries and fallback models (to survive high demand 503 errors)
 */
async function generateContentWithFallback(
  client: GoogleGenAI,
  payload: { contents: string; config: any }
) {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Requesting model: ${model} (attempt ${attempt}/2)`);
        const response = await client.models.generateContent({
          model,
          contents: payload.contents,
          config: payload.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = err.message || JSON.stringify(err);
        console.warn(`[Gemini] Warning on model ${model}, attempt ${attempt}:`, errMessage);

        const isTransient =
          errMessage.includes("503") ||
          errMessage.includes("UNAVAILABLE") ||
          errMessage.includes("429") ||
          errMessage.includes("RESOURCE_EXHAUSTED") ||
          errMessage.includes("high demand") ||
          errMessage.includes("spikes in demand");

        if (isTransient && attempt < 2) {
          // Wait 1.5 seconds before retrying the same model
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          // Break the attempt loop to fallback to the next model immediately
          break;
        }
      }
    }
  }
  throw lastError || new Error("Failed to generate content with all available models.");
}

/**
 * AI Endpoint to parse raw chaos input and output structured schedules, tasks, and draft actions
 */
app.post("/api/parse-chaos", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini AI is not initialized. Please verify GEMINI_API_KEY." });
    }

    const { chaosText, currentLocalTime, existingEvents, existingTasks } = req.body;

    if (!chaosText || typeof chaosText !== "string") {
      return res.status(400).json({ error: "chaosText is required and must be a string." });
    }

    const eventsContext = existingEvents && existingEvents.length > 0 
      ? `Existing Calendar Events (Busy Times):\n${JSON.stringify(existingEvents)}`
      : "No existing calendar events retrieved.";

    const tasksContext = existingTasks && existingTasks.length > 0
      ? `Existing Google Tasks:\n${JSON.stringify(existingTasks)}`
      : "No existing tasks retrieved.";

    const systemInstruction = `You are DeadlineAI, an elite, proactive AI Chief of Staff. The user is dumping their chaotic commitments, projects, deadlines, emails, and meetings.
Your goal is to:
1. Extract all tasks and deadlines mentioned.
2. Score each by urgency (1-10) and effort (1-10) based on stress levels and urgency described.
3. Create a prioritized action plan with specific recommended time blocks.
4. Suggest which tasks YOU can handle autonomously (e.g. drafting email responses, outline documents, or setting up calendar slots).
5. Give one encouraging, highly motivating, visionary productivity insight at the end.

Current time reference is: ${currentLocalTime || new Date().toISOString()}

Keep all responses structured in strict JSON matching the requested schema.`;

    const prompt = `Here is my chaotic dump:
"${chaosText}"

Context of my schedule:
${eventsContext}

Context of my task list:
${tasksContext}

Organize my life. Respond in structured JSON only.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["tasks", "schedulingSuggestions", "suggestedActionDrafts", "summary", "insight"],
          properties: {
            tasks: {
              type: Type.ARRAY,
              description: "A list of parsed structured tasks to be created or actioned.",
              items: {
                type: Type.OBJECT,
                required: ["title", "description", "priority", "urgencyScore", "effortScore", "recommendedDurationMinutes"],
                properties: {
                  title: { type: Type.STRING, description: "Clear, brief title of the task." },
                  description: { type: Type.STRING, description: "Description or context of what needs to be done." },
                  priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Urgency and priority level." },
                  urgencyScore: { type: Type.INTEGER, description: "Urgency score from 1 to 10 (10 being most urgent)." },
                  effortScore: { type: Type.INTEGER, description: "Effort score from 1 to 10 (10 being most effort-intensive)." },
                  recommendedDurationMinutes: { type: Type.INTEGER, description: "Estimated time in minutes needed to complete." },
                  dueApproximate: { type: Type.STRING, description: "Friendly estimated deadline, e.g. Friday afternoon, or tomorrow." }
                }
              }
            },
            schedulingSuggestions: {
              type: Type.ARRAY,
              description: "Proposed free slots in the user's schedule to focus on these tasks.",
              items: {
                type: Type.OBJECT,
                required: ["title", "startTime", "endTime", "description"],
                properties: {
                  title: { type: Type.STRING, description: "Title of the calendar block, e.g., 'Focus Block: Build slide deck'." },
                  startTime: { type: Type.STRING, description: "ISO 8601 timestamp representing start time." },
                  endTime: { type: Type.STRING, description: "ISO 8601 timestamp representing end time." },
                  description: { type: Type.STRING, description: "Specific goals for this focus block." }
                }
              }
            },
            suggestedActionDrafts: {
              type: Type.ARRAY,
              description: "High-value drafts prepared for the user to copy or use.",
              items: {
                type: Type.OBJECT,
                required: ["id", "taskTitle", "actionType", "draftTitle", "draftContent"],
                properties: {
                  id: { type: Type.STRING, description: "Unique temporary ID like draft_1, draft_2" },
                  taskTitle: { type: Type.STRING, description: "The task title this draft is corresponding to." },
                  actionType: { type: Type.STRING, enum: ["email", "document", "checklist"], description: "Type of prepared action." },
                  draftTitle: { type: Type.STRING, description: "Subject line or document title." },
                  draftContent: { type: Type.STRING, description: "The complete, rich-text markdown written draft content." }
                }
              }
            },
            summary: {
              type: Type.STRING,
              description: "An encouraging, strategic summary of how you organized their chaos and what they should focus on first."
            },
            insight: {
              type: Type.STRING,
              description: "One motivating insight or productivity quote for the user."
            }
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No text returned from Gemini API");
    }

    const parsedData = JSON.parse(responseText.trim());
    return res.json(parsedData);

  } catch (error: any) {
    console.error("Error parsing chaos input:", error);
    return res.status(500).json({ error: error.message || "Failed to parse chaos with AI." });
  }
});

/**
 * AI Endpoint to generate a tailored "Handle It" draft action
 */
app.post("/api/draft-action", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini AI is not initialized." });
    }

    const { taskTitle, taskDescription, actionType } = req.body;

    if (!taskTitle) {
      return res.status(400).json({ error: "taskTitle is required." });
    }

    const prompt = `Create a high-quality action helper for this task:
Title: ${taskTitle}
Description: ${taskDescription || "N/A"}
Requested Action Type: ${actionType || "checklist"}

If email: Write a professional, polite, and persuasive draft email reply. Include placeholders like [Your Name], [Client Name] cleanly.
If document: Write a structured preparation document, brief, or meeting prep outline.
If checklist: Write a detailed, step-by-step roadmap/checklist to successfully achieve this task.

Format the output strictly as a JSON object:
{
  "draftTitle": "Brief subject or document heading",
  "draftContent": "The detailed markdown draft content"
}`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["draftTitle", "draftContent"],
          properties: {
            draftTitle: { type: Type.STRING },
            draftContent: { type: Type.STRING }
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No text returned from Gemini API");
    }

    const parsedData = JSON.parse(responseText.trim());
    return res.json(parsedData);

  } catch (error: any) {
    console.error("Error generating draft:", error);
    return res.status(500).json({ error: error.message || "Failed to generate draft action." });
  }
});

// Setup Vite Dev server or production static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Chief of Staff Server running at http://localhost:${PORT}`);
  });
}

startServer();
