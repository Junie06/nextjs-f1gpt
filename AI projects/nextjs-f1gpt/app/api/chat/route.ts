import Groq from "groq-sdk";
import { OpenAIStream, StreamingTextResponse } from "@ai-sdk/react";
import { OpenAI } from "openai";
import { MistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    GROQ_API_KEY,
    MISTRAL_API_KEY
} = process.env;

const groq = new Groq({ apiKey: GROQ_API_KEY });

// Initialize Astra DB connection
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const latestMessage = messages[messages?.length - 1]?.text;

        let docContext = "";

        //Initialize Mistral model for embeddings
        const embeddings = await new MistralAIEmbeddings({
            model: "mistral-embed"
        });

        const embedding = await embeddings.embedQuery(latestMessage)

        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION)
            const cursor = collection.find(null, {
                sort: {
                    $vector: embedding.data[0].embedding,
                },
                limit: 10,
            })

            const documents = await cursor.toArray();
            const docsMap = documents?.map(doc => doc.text).join("\n\n");
            docContext = JSON.stringify(docsMap);
            console.log("Context:", docContext)

            } catch (error) {
                console.log("Error querying db...", error)
                docContext = "";
            }

            const template = {
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

           const response = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [...messages, template],
            });

            console.log(response.choices[0]?.message?.content);
            return new StreamingTextResponse(OpenAIStream(response));
    } catch (error) {
        throw error;
    }
    }