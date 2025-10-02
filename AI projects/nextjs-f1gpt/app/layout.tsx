
import "./global.css"

export const metadata = {
  title: "F1GPT",
  description: "The AI-powered Formula 1 assistant for all your F!1 questions.",
}

const RootLayout = ({ children }) => {
  return (
    <html lang = "en">
      <body>{children}</body>
    </html>
  )
}

export default RootLayout;