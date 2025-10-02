"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { type UIMessage } from "ai"
import Image from "next/image"
import f1GPTLogo from "./assets/f1gpt logo.png"


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
    }

    const noMessages = true

    return (
        <main>
            <Image src={f1GPTLogo} width="250" alt="F1GPT"/>
            <section className={noMessages ? "" : "populated"} >
                {noMessages ? (
                <>
                <p>
                    Hey! Welcome to F1GPT! 
                    I'm here to talk about all things Formula One. It will come back
                    with the most up-to-date answers, we hope you enjoy
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
            </section>
            <form onSubmit={handleSubmit}>
                <input className="question-box" 
                onChange={handleInputChange} 
                value={input} placeholder="Ask me something"/>
                <input type="submit"/>
            </form>
        </main>
            
    )
}

export default Home