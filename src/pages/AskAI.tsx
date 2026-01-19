import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowLeft, Loader2, Send } from 'lucide-react';

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    source: string;
}

export const AskAI = () => {
    const navigate = useNavigate();
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    const searchWeb = async (query: string): Promise<SearchResult[]> => {
        const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
        const cxId = import.meta.env.VITE_GOOGLE_CX_ID;

        if (!apiKey || !cxId) {
            console.error('Google Search API keys are missing');
            return [];
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query + ' education college course details reviews')}`
            );

            if (!response.ok) throw new Error('Search failed');
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

    const handleChatSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim() || isChatLoading) return;

        const userMessage = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsChatLoading(true);

        try {
            // 1. Search for live info
            const searchResults = await searchWeb(userMessage);
            const context = searchResults.map(r => `Title: ${r.title}\nSource: ${r.source}\nSnippet: ${r.snippet}`).join('\n\n');

            // 2. AI Answer
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) throw new Error("API Key missing");

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are a helpful education and career counselor. Answer the user\'s question detailedly using the provided search context. Cite sources where possible.' },
                        { role: 'user', content: `Question: ${userMessage}\n\nSearch Context:\n${context}` }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            const aiReply = data.choices[0].message.content;

            setChatMessages(prev => [...prev, { role: 'assistant', content: aiReply }]);
        } catch (error) {
            console.error(error);
            setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to my knowledge base right now. Please try again." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0e1621] text-white selection:bg-[#10b981]/30 flex flex-col">
            <Helmet>
                <title>Guide Light - Ask AI</title>
            </Helmet>

            {/* Header */}
            <div className="bg-[#0e1621] border-b border-[#2a3544] p-6 sticky top-0 z-20 backdrop-blur-md bg-opacity-80">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-[#2a3544] rounded-lg transition-colors text-gray-400 hover:text-white"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl flex items-center justify-center shadow-lg shadow-[#10b981]/10">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Ask Guide Light</h1>
                                <p className="text-sm text-gray-500">Your AI Study & Career Companion</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col">
                <div className="bg-[#1a2332] rounded-2xl shadow-xl border border-[#2a3544] flex-1 flex flex-col overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-8">
                                <div className="w-20 h-20 bg-[#0e1621] rounded-2xl flex items-center justify-center mb-6 border border-[#2a3544]">
                                    <Bot className="w-10 h-10 text-[#10b981]" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">How can I help you?</h3>
                                <p className="text-gray-400 max-w-sm">
                                    I can answer questions about course details, college comparisons, admission criteria, and career prospects.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-lg w-full">
                                    {['What is B.Tech?', 'Top MBA colleges in India?', 'Python vs Java for beginners', 'Career in Data Science'].map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => setChatInput(q)}
                                            className="text-sm bg-[#0e1621] hover:bg-[#2a3544] border border-[#2a3544] hover:border-[#10b981]/50 text-gray-300 py-3 px-4 rounded-xl transition-all text-left"
                                        >
                                            "{q}"
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-5 ${msg.role === 'user'
                                            ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20'
                                            : 'bg-[#0e1621] text-gray-200 border border-[#2a3544]'
                                        }`}>
                                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-[#0e1621] border border-[#2a3544] rounded-2xl p-4 flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" />
                                    <span className="text-sm text-gray-400 font-medium">Consulting live sources...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-[#2a3544] bg-[#0e1621]/80 backdrop-blur-sm">
                        <form onSubmit={handleChatSubmit} className="relative flex gap-3">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Ask about colleges, courses, or careers..."
                                className="flex-1 pl-4 pr-4 py-4 bg-[#0e1621] border border-[#2a3544] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isChatLoading || !chatInput.trim()}
                                className="px-6 bg-[#10b981] text-white rounded-xl hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg shadow-[#10b981]/20 hover:scale-105 active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
