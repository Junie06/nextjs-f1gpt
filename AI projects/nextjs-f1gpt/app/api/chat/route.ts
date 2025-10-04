import { type ModelMessage, streamText, type TextPart } from "ai";
import { MistralAIEmbeddings } from "@langchain/mistralai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages } from "ai";


const {
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    GROQ_API_KEY,
    MISTRAL_API_KEY
} = process.env;

// Initialize clients
const groqProvider = createGroq({
  apiKey: GROQ_API_KEY, // Pass the API key directly
});
const dbClient = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = dbClient.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

const groqModel = groqProvider("llama-3.3-70b-versatile");

export async function POST(req: Request) {
    try {
        // 1. Get messages from the request
        const { messages } = await req.json();
        const modelMessages = convertToModelMessages(messages);
        const latestMessage = messages[messages?.length - 1]?.content;

        let latestMessageText = "";

        if (latestMessage) {
            if (typeof latestMessage === "string") {
                latestMessageText = latestMessage;
            } else if (Array.isArray(latestMessage)) {
                // Find and extract the text from the message parts
                const textPart = latestMessage.find(
                    (part) => part.type === "text"
                ) as TextPart; // Type cast for convenience

                if (textPart) {
                    latestMessageText = textPart.text;
                }
            }
        }


        let docContext = "";

        // --- 2. Embedding and Retrieval (RAG) ---
        try {
            // Initialize Mistral model for embeddings
            if (latestMessageText.length > 0) {
                const embeddings = new MistralAIEmbeddings({
                model: "mistral-embed",
                apiKey: MISTRAL_API_KEY,
        });
            // Generate the embedding vector for the latest message
            const embeddingVector = await embeddings.embedQuery(latestMessageText);

            const collection = db.collection(ASTRA_DB_COLLECTION)

            const documents = await collection.find({},
                {
                    sort: {
                        $vector: embeddingVector,
                    },
                    limit: 5,
                    projection: {
                        content: 1,
                    },
                }
            ).toArray();
        
            // Format the retrieved context
            docContext = documents?.map(doc => doc.content).join("\n---\n") || "";

            console.log("Context:", docContext)
        }

            } catch (error) {
                console.log("Error during embedding or querying db...", error)
                docContext = "";
            }

            
            // --- 3. Construct Final Prompt & Generate Response ---
        const systemPrompt = `You are F1GPT, a friendly and helpful AI who is an expert in Formula One.
        Use the below context to augment what you know about Formula One racing.
        The context will provide you with the most recent data about Formula One.
        If the context doesn't include the information you need, answer based on your general knowledge.
        Do not mention the source of your information or what the context does or doesn't include.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        --- CONTEXT START ---
        ${docContext}
        --- CONTEXT END ---
        `;

        /*const finalMessages: ModelMessage[] = [
            { role: "system", content: systemPrompt },
            ...messages
            ];*/ // Simplified for non-text parts

            // Stream the response from the model
            const result = await streamText({
                model: groqModel,
                system: systemPrompt,
                messages: modelMessages,
                temperature: 0.7,
            });
        return result.toTextStreamResponse();
    } catch (error) {
        console.error("An unexpected error occurred in POST handler:", error);
        return new Response(JSON.stringify({ error: "Failed to generate response" }), { 
            status: 500,
            headers: { "Content-Type": "application/json" },
    });
    }
}