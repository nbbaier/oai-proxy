import { OpenAI } from "openai";

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: "http://localhost:3000/v1",
});

const response = await client.chat.completions.create({
 	model: "gpt-4.1",
	messages: [{ role: "user", content: "Explain it to my like I'm five: why is the sky blue?" }],
});

console.log(response.choices[0]?.message?.content ?? "No response");
