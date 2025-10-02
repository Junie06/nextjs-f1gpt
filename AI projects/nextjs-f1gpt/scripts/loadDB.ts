import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import Groq from "groq-sdk"
import { MistralAIEmbeddings } from "@langchain/mistralai"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

import "dotenv/config"

// Define the type for vector metrics
type Similarity = "dot_product" | "cosine" | "euclidean"

// Destructure environment variables
const { 
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    GROQ_API_KEY,
    MISTRAL_API_KEY
} = process.env

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// List of URLs to scrape
const f1Data = [
    "https://en.wikipedia.org/wiki/Formula_One",
    "https://www.formula1.com/",
    "https://www.bbc.com/sport/formula1",
    "https://www.skysports.com/f1",
    "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions",
    "https://en.wikipedia.org/wiki/2025_Formula_One_World_Championship"
]

// Initialize Astra DB connection
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE })

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100
});


// Function to create the vector collection in Astra DB
const createCollection = async (similarityMetric: Similarity = "dot_product") => {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
        vector: {
            dimension: 1024,
            metric: similarityMetric,
        }
        })
            console.log(res)
    }
    

// Initialize Mistral AI embeddings for client-side vector generation
const embeddings = new MistralAIEmbeddings({
  model: "mistral-embed", // Default value
});


/**
 * Scrapes the content of a single URL using Puppeteer.
 * Returns clean text content.
 */
const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: { headless: true },
        gotoOptions: { waitUntil: "domcontentloaded"},
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerText)
            await browser.close()
            return result
    }
})

// Scrape and clean up any remaining tags or multiple spaces
    const documents = await loader.load()
    return documents[0].pageContent.replace(/\s+/g, ' ').trim()
}

/**
 * Loads and processes data into the Astra DB collection using client-side embeddings.
 */
const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION)

    for ( const url of f1Data ) {
        try {
            console.log(`\nProcessing data from: ${url}`)
            const content = await scrapePage(url)

            if (content.length === 0) {
                console.log(`No content found at ${url}. Skipping.`)
                continue;
            }

        const chunks = await splitter.splitText(content)
        const insertOps = []

            // Iterate over chunks and prepare for insertion
        for ( const chunk of chunks ) {
            const embedding = await embeddings.embedQuery(chunk)
            insertOps.push(collection.insertOne({
                    content: chunk, 
                    sourceUrl: url,
                    $vector: embedding, 
                }))
            }
            await Promise.all(insertOps)

            console.log(`Inserted ${chunks.length} chunks from ${url}`)
        } catch (error) {
            console.error(`Error processing ${url}:`, error)
    }
}
    console.log("\n--- Data loading complete! ---")
}

createCollection().then(() => loadSampleData())