import Groq from "groq-sdk";
import { streamText, type ModelMessage, StreamingTextResponse } from "ai";
import { MistralAIEmbeddings } from "@langchain/mistralai";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    GROQ_API_KEY,
    MISTRAL_API_KEY
} = process.env;

// Initialize clients
const groq = new Groq({ apiKey: GROQ_API_KEY });
const dbClient = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = dbClient.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
        // 1. Get messages from the request
    try {
        const { messages } = await req.json();
        const latestMessage = messages[messages?.length - 1]?.content;

        let docContext = "";

        // --- 2. Embedding and Retrieval (RAG) ---
        try {
            // Initialize Mistral model for embeddings
             const embeddings = new MistralAIEmbeddings({
            model: "mistral-embed"
        });
            // Generate the embedding vector for the latest message
            const embedding = await embeddings.embedQuery(latestMessage);

            const collection = db.collection(ASTRA_DB_COLLECTION)

            const documents = await collection.find({},
                {
                    sort: {
                        $vector: embedding,
                    },
                    limit: 5,
                    projection: {
                        content: 1,
                    },
                }
            ).toArray();
        
            // Format the retrieved context
            const docsMap = documents?.map(doc => doc.text).join("\n\n");

            docContext = JSON.stringify(docsMap);

            console.log("Context:", docContext)

            } catch (error) {
                console.log("Error querying db...", error)
                docContext = "";
            }

            
            // --- 3. Construct Final Prompt & Generate Response ---
            const systemPrompt = {
                role: "system", 
                content: `You are F1GPT, a friendly and helpful AI who is an expert in Formula One.
                Use the below context to augment what you know about formula One racing.
                The context will provide you with the most recent page data about Formula One.
                If the context doesn't include the information you need answer based on what you know, and
                don't mention the source of your information or what the context does or doesn't include.
                If you don't know the answer, just say that you don't know, don't try to make up an answer."
                Context: ${docContext}
                Question: ${latestMessage}`
            }

            const response = await streamText({
                model: "llama-3.3-70b-versatile",
                messages: [...messages, systemPrompt],
                temperature: 0.7
            });
            
        return new StreamingTextResponse(response.toStream());
    } catch (error) {
        throw error;
    }
    }