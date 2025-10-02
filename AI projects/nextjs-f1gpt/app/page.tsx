"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { type UIMessage } from "ai"


const Home = () => {
    const [input, setInput] = useState("")
    const { messages, status, sendMessage} = useChat();
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (input.trim()) {
            await sendMessage({ text: input});
            setInput("");
        }

    const noMessages = true

    return (
        <main className="flex h-screen flex-col bg-background">
            <section className={noMessages ? "" : "populated"} >
            {noMessages ? (
                <>
                <p>
                    Hey! Welcome to F1GPT! 
                    I'm here to talk about all things Formula One.
                </p>
                <br/>
                {/*<PromptSuggestionsRow/>*/}

                </>
            ) : (
                <>
                   {/*map messages onto text bubbles*/}
                   {/*<LoadingBubble />*/}
                </>
            )}
            <form onSubmit={handleSubmit}>
                <input className="question-box" 
                onChange={handleInputChange} 
                value={input} placeholder="Ask me something"/>
                <input type="submit"/>
            </form>
            </section>
            </main>
    )
}
}