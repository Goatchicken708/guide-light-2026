import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, ArrowLeft, Loader2, Sparkles, Search, ExternalLink } from 'lucide-react';

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    source: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    searchResults?: SearchResult[];
    recommendation?: string;
    type?: 'chat' | 'analysis';
}

export const AIAssistant = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Hello! I am Guide Light. I can help guide your career path, find relevant courses, and search for job opportunities. What are you looking for today?'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState<string>('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const searchWeb = async (query: string): Promise<SearchResult[]> => {
        const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
        const cxId = import.meta.env.VITE_GOOGLE_CX_ID;

        if (!apiKey || !cxId) {
            console.error('Google Search API keys are missing');
            // Fallback to simulation/empty if real keys are missing in dev but expected in prod
            return [];
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query)}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Search API Error:', errorData);
                throw new Error('Search failed');
            }

            const data = await response.json();

            if (!data.items) return [];

            return data.items.map((item: any) => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                source: item.displayLink || new URL(item.link).hostname
            }));
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    };

    const getAIAnalysis = async (query: string, results: SearchResult[]): Promise<string> => {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;

        if (!apiKey) {
            return "I'm sorry, I seem to be offline (API Key missing).";
        }

        const context = results.map(r => `Title: ${r.title}\nSource: ${r.source}\nLink: ${r.link}\nSummary: ${r.snippet}`).join('\n\n');

        const systemPrompt = `You are Guide Light, an expert Career Counselor and Education Guide. 
    Your goal is to help students and professionals find the best courses, jobs, and career paths.
    
    Instructions:
    1. Analyze the user's query and the provided search results.
    2. Recommend the best options (courses, jobs, or resources) based on quality, relevance, and credibility.
    3. Explain WHY you chose these specific recommendations.
    4. Provide actionable advice on what steps to take next.
    5. Format your response clearly with Markdown (bolding key terms, lists, etc.).
    
    Context (Search Results):
    ${context}
    `;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-20b',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: query }
                    ],
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('AI Error:', err);
                throw new Error('AI analysis failed');
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "I couldn't generate an analysis at this time.";
        } catch (error) {
            console.error('AI Request Error:', error);
            return "I encountered an error while analyzing the results. Please try again.";
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userQuery = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
        setLoading(true);

        try {
            // Step 1: Search
            setLoadingStep('Searching the web...');
            const searchResults = await searchWeb(userQuery);

            // Step 2: Analyze
            setLoadingStep('Analyzing best options...');
            const analysis = await getAIAnalysis(userQuery, searchResults);

            // Result
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: analysis,
                searchResults: searchResults,
                type: 'analysis'
            }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error while processing your request." }]);
        } finally {
            setLoading(false);
            setLoadingStep('');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans selection:bg-[#10b981] selection:text-white">
            <Helmet>
                <title>Guide Light - CareerConnect</title>
            </Helmet>

            {/* Header */}
            <div className="bg-[#1e293b]/80 backdrop-blur-md border-b border-[#334155] p-4 flex items-center justify-between sticky top-0 z-10 shadow-lg">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-[#334155] rounded-xl transition-all duration-200 text-gray-400 hover:text-white active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#10b981] to-[#0f766e] rounded-xl flex items-center justify-center shadow-lg shadow-[#10b981]/20 ring-1 ring-white/10">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#34d399] to-[#10b981]">Guide Light</h1>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Powered by Google Search
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-6 max-w-4xl mx-auto w-full custom-scrollbar scroll-smooth"
                ref={scrollRef}
            >
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out`}
                    >
                        {/* Message Bubble */}
                        <div
                            className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 shadow-lg backdrop-blur-sm ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-[#10b981] to-[#059669] text-white rounded-br-none shadow-[#10b981]/10'
                                : 'bg-[#1e293b] text-gray-100 rounded-bl-none border border-[#334155] shadow-black/20'
                                }`}
                        >
                            <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed break-words">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors underline decoration-emerald-400/30 hover:decoration-emerald-400" />,
                                        p: ({ node, ...props }) => <p {...props} className="mb-4 last:mb-0" />,
                                        ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-4 space-y-2 marker:text-emerald-500" />,
                                        ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-4 space-y-2 marker:text-emerald-500" />,
                                        li: ({ node, ...props }) => <li {...props} className="pl-1" />,
                                        strong: ({ node, ...props }) => <strong {...props} className="font-bold text-emerald-100" />,
                                        h1: ({ node, ...props }) => <h1 {...props} className="text-2xl font-bold mb-4 mt-6 text-white border-b border-gray-700 pb-2" />,
                                        h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-bold mb-3 mt-5 text-white" />,
                                        h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-bold mb-2 mt-4 text-white" />,
                                        blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-4 border-emerald-500/50 pl-4 py-1 my-4 bg-gray-800/50 rounded-r italic text-gray-300" />,
                                        code: ({ node, className, children, ...props }) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const isInline = !match && !className; // Simple check for inline code
                                            return isInline ? (
                                                <code {...props} className="bg-gray-800 rounded px-1.5 py-0.5 text-sm font-mono text-emerald-300 border border-gray-700/50">
                                                    {children}
                                                </code>
                                            ) : (
                                                <div className="bg-[#0f172a] rounded-lg border border-gray-700/50 overflow-hidden mb-4 shadow-inner">
                                                    <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700/50 text-xs text-gray-400 font-mono flex items-center justify-between">
                                                        <span>{match?.[1] || 'Code'}</span>
                                                    </div>
                                                    <div className="p-4 overflow-x-auto">
                                                        <code {...props} className={`block text-sm font-mono text-gray-300 ${className || ''}`}>
                                                            {children}
                                                        </code>
                                                    </div>
                                                </div>
                                            )
                                        },
                                        table: ({ node, ...props }) => <div className="overflow-x-auto mb-4 border border-gray-700 rounded-lg"><table {...props} className="w-full text-left border-collapse" /></div>,
                                        th: ({ node, ...props }) => <th {...props} className="bg-gray-800/80 p-3 border-b border-gray-700 font-semibold text-emerald-100" />,
                                        td: ({ node, ...props }) => <td {...props} className="p-3 border-b border-gray-800/50" />
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {/* Search Results Cards */}
                        {msg.searchResults && msg.searchResults.length > 0 && (
                            <div className="mt-4 w-full max-w-[85%] md:max-w-[75%] space-y-3">
                                <p className="text-xs text-emerald-400 font-semibold px-1 flex items-center gap-1.5 uppercase tracking-wider">
                                    <Search className="w-3.5 h-3.5" />
                                    Sources Analyzed
                                </p>
                                <div className="grid gap-2.5">
                                    {msg.searchResults.map((result, rIdx) => (
                                        <a
                                            key={rIdx}
                                            href={result.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-3.5 bg-[#1e293b]/50 border border-[#334155] rounded-xl hover:border-[#10b981]/50 hover:bg-[#1e293b] transition-all duration-200 group relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#10b981]/0 via-[#10b981]/5 to-[#10b981]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                            <div className="flex items-start justify-between gap-3 relative z-10">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-semibold text-[#34d399] group-hover:text-[#10b981] transition-colors truncate">{result.title}</h4>
                                                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed group-hover:text-gray-300 transition-colors">{result.snippet}</p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#10b981] transition-colors flex-shrink-0" />
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 relative z-10">
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-[#0f172a] px-2.5 py-1 rounded-md border border-[#334155] group-hover:border-[#10b981]/30 transition-colors">
                                                    {result.source}
                                                </span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="bg-[#1e293b] rounded-2xl px-6 py-4 border border-[#334155] rounded-bl-none flex items-center gap-4 shadow-lg shadow-black/20">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#10b981]/20 rounded-full animate-ping"></div>
                                <Loader2 className="w-5 h-5 animate-spin text-[#10b981] relative z-10" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-white animate-pulse">{loadingStep}</span>
                                <span className="text-xs text-gray-400">Powered by Guide Light AI</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#1e293b]/80 backdrop-blur-md border-t border-[#334155] shadow-2xl">
                <div className="max-w-4xl mx-auto w-full relative">
                    <form onSubmit={handleSend} className="flex gap-3">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Sparkles className="h-5 w-5 text-gray-400 group-focus-within:text-[#10b981] transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Guide Light about your career path..."
                                className="w-full bg-[#0f172a] text-white border border-[#334155] rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/50 transition-all shadow-inner placeholder:text-gray-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-xl transition-all shadow-lg shadow-[#10b981]/20 active:scale-95 flex items-center justify-center transform hover:-translate-y-0.5"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-gray-500 mt-3 font-medium tracking-wide uppercase opacity-60">
                        Guide Light may produce inaccurate information • Verify important details
                    </p>
                </div>
            </div>
        </div>
    );
};
