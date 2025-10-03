import { on } from "events";
import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionRow = ({ onPromptClick }) => {
    const prompts = [
        "Who won the 2023 Monaco Grand Prix?",
        "What are the latest F1 regulations for 2024?",
        "Tell me about Lewis Hamilton's career highlights.",
        "How does the points system work in Formula One?",
        "What are the most iconic F1 cars of all time?"
    ];

    return (
        <div className="prompt-suggestion-row">
            {prompts.map((prompt, index) => 
            <PromptSuggestionButton 
            key={`suggestion-${index}`} 
            text={prompt} 
            onClick={() => onPromptClick(prompt)}
            />)}
        </div>
    )
}

export default PromptSuggestionRow;