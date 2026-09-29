import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || "",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// IMPORTANT! Set the runtime to edge: https://vercel.com/docs/functions/edge-functions/edge-runtime
export const runtime = "edge";

export async function POST(req) {
  if (!process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY === "") {
    return new Response(
      "Missing NVIDIA_API_KEY – make sure to add it to your .env file.",
      { status: 400 }
    );
  }

  try {
    let { prompt } = await req.json();

    const response = await openai.chat.completions.create({
      model: "z-ai/glm-5.3-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an AI writing assistant that continues existing text based on context from prior text. " +
            "Give more weight/priority to the later characters than the beginning ones. " +
            "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
            "Do not generate empty responses.",
          // we're disabling markdown for now until we can figure out a way to stream markdown text with proper formatting: https://github.com/steven-tey/novel/discussions/7
          // "Use Markdown formatting when appropriate.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,
      n: 1,
    });

    const stream = OpenAIStream(response, {
      onCompletion: (completion) => {
        if (!completion.trim()) {
          throw new Error("Empty response generated");
        }
      },
    });

    // start the stream with the word "Generating..."

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error in generate API:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
