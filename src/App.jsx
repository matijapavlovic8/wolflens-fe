import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Shield, Search, Activity, Database, FileText, Terminal } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS & MOCK DATA ---
const DEMO_MODE = true; //

const MOCK_SEARCH_RESPONSE = {
  result: {
    query: "Shai Hulud worm",
    articles: [
      {
        title: "Self-Replicating Worm Hits 180+ npm Packages to Steal ...",
        author: null,
        url: "https://thehackernews.com/2025/09/40-npm-packages-compromised-in-supply.html",
        quality_score: 0.5,
        relevancy_score: 0.9,
        summary: "A self-replicating worm, codenamed Shai-Hulud, has impacted over 180 npm packages, aiming to steal credentials in a significant supply chain attack. The malware exhibits self-propagating capabilities, automatically infecting downstream packages."
      },
      {
        title: "Shai-Hulud v2 Spreads From npm to Maven, as Campaign ...",
        author: null,
        url: "https://thehackernews.com/2025/11/shai-hulud-v2-campaign-spreads-from-npm.html",
        quality_score: 0.46,
        relevancy_score: 0.9,
        summary: "The second iteration of the Shai-Hulud attack has expanded its reach from the npm registry to the Maven ecosystem, compromising over 830 packages. The attackers exploited CI misconfigurations in GitHub Actions workflows to execute the attack."
      },
      {
        title: "1 Trusted Source for Cybersecurity News — Index Page",
        author: null,
        url: "https://thehackernews.com/search?updated-max=2025-10-24T03:00:00-07:00&max-results=13&start=91&by-date=false",
        quality_score: 0.57,
        relevancy_score: 0.8,
        summary: "A brief mention of the Shai-Hulud worm, which targeted the npm ecosystem in mid-September 2025. This result is from a search index page and not a dedicated article."
      }
    ],
    total_results: 3,
    message: "I found 3 relevant articles about the Shai Hulud worm. The most recent articles discuss its evolution and spread to other ecosystems like Maven. Here are the details:"
  }
};

const MOCK_EXPLAIN_RESPONSE = {
  result: {
    query: "how does the Shai Hulud worm spread",
    articles: [],
    total_results: 0,
    message: "The Shai-Hulud worm spreads by infecting npm packages. When a developer installs a compromised package, the worm uses the developer's credentials to modify and republish other packages they maintain, inserting malicious code. This creates a chain reaction, as anyone who installs these newly infected packages will also spread the worm."
  }
};

const MOCK_TRACK_RESPONSE = {
  result: {
    query: "Shai Hulud worm",
    articles: [],
    total_results: 0,
    message: "I am now tracking the 'Shai Hulud worm' theme for you."
  }
};

// --- COMPONENTS ---

const TypewriterEffect = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, 20);
    return () => clearInterval(timer);
  }, [text, onComplete]);

  return <span>{displayedText}</span>;
};

const ArticleCard = ({ article }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative p-6 rounded-xl bg-midnight border border-shadow/30 hover:border-neural/50 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-neural/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <span className="bg-neural/10 text-neural text-xs px-2 py-1 rounded-full border border-neural/20">
            Relevancy: {Math.round(article.relevancy_score * 100)}%
          </span>
          {article.quality_score && (
            <span className="text-wolf text-xs flex items-center gap-1">
              <Activity size={12} /> Q: {article.quality_score}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-beige mb-2 leading-tight group-hover:text-neural transition-colors">
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {article.title}
          </a>
        </h3>

        <p className="text-wolf text-sm line-clamp-4 flex-grow">
          {article.summary}
        </p>

        <div className="mt-4 pt-4 border-t border-shadow/30 flex justify-between items-center">
          <span className="text-xs text-shadow font-mono truncate max-w-[70%]">
            {new URL(article.url).hostname}
          </span>
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 bg-shadow/20 rounded-full hover:bg-neural/20 text-wolf hover:text-neural transition-colors"
          >
            <FileText size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

// --- MAIN APP ---

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [trackMessage, setTrackMessage] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setHasInteracted(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setTrackMessage(null); // Reset track message on new search

    try {
      let data;
      
      if (DEMO_MODE) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const lowerMsg = userMessage.toLowerCase();
        if (lowerMsg.includes("track")) {
          data = MOCK_TRACK_RESPONSE;
        } else if (lowerMsg.includes("propagates") || lowerMsg.includes("spread") || lowerMsg.includes("explain")) {
          data = MOCK_EXPLAIN_RESPONSE;
        } else {
          data = MOCK_SEARCH_RESPONSE;
        }
      } else {
        const response = await axios.post('http://localhost:8000/chat', {
          user_id: "777",
          session_id: "1",
          message: userMessage
        });
        // Assuming the API structure matches the mocked one, 
        // specifically that response.data is the JSON string returned by AIMessage
        // or the already parsed JSON object. 
        // The user prompt says "structured_json_str" is returned in content.
        // We might need to parse it if it's a string.
        
        // If the backend returns the raw string in a wrapper:
        // data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        
        // Based on common patterns, let's assume the backend returns the JSON directly.
        data = response.data;
      }

      // Process response
      const result = data.result || data; // Handle potential nesting
      
      // Add assistant message (text response)
      if (result.message) {
         setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
      }

      // Update grid if articles exist
      if (result.articles && result.articles.length > 0) {
        setSearchResults(result.articles);
      } else if (result.articles && result.articles.length === 0 && userMessage.toLowerCase().includes("track")) {
         // If it's a tracking command and no articles, maybe show a toast or keep previous results?
         // Requirement: "Respond only with a confirmation that the theme is tracked"
         // We already added the message. Let's maybe show a visual indicator.
         setTrackMessage(`Tracking: ${result.query}`);
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "System error: Unable to connect to WolfLens neural network." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-midnight text-beige font-sans selection:bg-neural/30 overflow-hidden flex flex-col">
      
      {/* Header / Nav */}
      <header className="h-16 border-b border-shadow/20 flex items-center px-6 justify-between bg-midnight/80 backdrop-blur-md z-50 fixed w-full top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/wolfsense-logo-transparent.png" alt="WolfLens Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-beige">
            WolfLens <span className="text-neural font-light text-sm ml-1"></span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-wolf">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-vector animate-pulse" />
            SYSTEM ONLINE
          </div>
          <div>v2.5.0</div>
        </div>
      </header>

      <main className="flex-grow pt-16 flex relative">
        
        {/* Chat Container - Width transitions from full to half */}
        <motion.div 
          layout
          initial={{ width: "100%" }}
          animate={{ width: hasInteracted ? "50%" : "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "flex flex-col h-[calc(100vh-64px)] transition-all duration-500 ease-in-out border-r border-shadow/20 relative z-20 bg-midnight overflow-hidden",
             // On mobile, always full width unless we want to stack. For now assuming desktop for split view.
             !hasInteracted ? "max-w-3xl mx-auto border-none" : ""
          )}
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 z-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'url("/perfectwolf.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-midnight/90 via-transparent to-midnight/90" />
          </div>

          {/* Chat History */}
          <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
            {!hasInteracted && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-80">
                <div className="w-20 h-20 bg-gradient-to-b from-shadow/30 to-transparent rounded-full flex items-center justify-center mb-6 ring-1 ring-neural/20">
                   <Terminal size={40} className="text-neural" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-beige">WolfLens Intelligence</h2>
                <p className="text-wolf max-w-md">
                  Advanced cybersecurity research assistant. Search TheHackerNews, track threats, and analyze vulnerabilities.
                </p>
                
                <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-lg">
                  {["Recent Ransomware", "Zero-day Exploits", "AI Security", "Track 'Shai Hulud'"].map((suggestion) => (
                    <button 
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="p-3 rounded-lg bg-shadow/10 border border-shadow/20 hover:border-neural/50 hover:bg-shadow/20 text-sm text-left transition-all text-wolf hover:text-beige"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-neural/10 text-beige border border-neural/20 rounded-br-none" 
                    : "bg-shadow/10 text-gray-200 border border-shadow/20 rounded-bl-none"
                )}>
                  {msg.role === 'assistant' ? (
                     // Simple rendering for now, could be markdown
                     <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                 <div className="bg-shadow/10 rounded-2xl rounded-bl-none px-5 py-4 border border-shadow/20 flex gap-2 items-center">
                    <div className="w-2 h-2 bg-neural rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-neural rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-neural rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
               </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-midnight/90 backdrop-blur-sm border-t border-shadow/20">
             <form onSubmit={handleSubmit} className="relative">
               <input
                 type="text"
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 placeholder="Ask about threats, vulnerabilities, or articles..."
                 className="w-full bg-shadow/10 text-beige placeholder-wolf/50 rounded-xl py-4 pl-5 pr-12 border border-shadow/30 focus:border-neural/50 focus:ring-1 focus:ring-neural/50 outline-none transition-all"
                 disabled={isLoading}
               />
               <button 
                 type="submit"
                 disabled={isLoading || !input.trim()}
                 className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-neural/10 hover:bg-neural/20 text-neural rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Send size={18} />
               </button>
             </form>
             <div className="text-center mt-2 text-[10px] text-wolf uppercase tracking-widest opacity-50">
            
             </div>
          </div>
        </motion.div>

        {/* Right Side - Grid Results */}
        <AnimatePresence>
          {hasInteracted && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-1/2 h-[calc(100vh-64px)] overflow-y-auto bg-midnight/50 p-6 border-l border-shadow/10"
            >
              {trackMessage && (
                <motion.div 
                   initial={{ opacity: 0, y: -20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mb-6 p-4 bg-vector/10 border border-vector/20 rounded-xl flex items-center gap-3 text-vector"
                >
                   <Activity size={20} />
                   <span className="font-medium">{trackMessage}</span>
                </motion.div>
              )}

              {searchResults ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-beige flex items-center gap-2">
                      <Database size={18} className="text-neural" />
                      Intelligence Feed
                    </h3>
                    <span className="text-xs font-mono text-wolf border border-shadow/30 px-2 py-1 rounded">
                      {searchResults.length} RESULTS FOUND
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {searchResults.map((article, idx) => (
                      <ArticleCard key={idx} article={article} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-shadow/40">
                  <Search size={48} className="mb-4 opacity-50" />
                  <p>Awaiting query results...</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

export default App;
