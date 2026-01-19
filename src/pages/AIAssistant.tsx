import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Users, DollarSign, Award, Brain, BarChart3, Lightbulb, ChevronDown, ChevronUp, Bot, ArrowLeft, Sparkles, Loader2, Link2 } from 'lucide-react';

interface Course {
    id: number;
    name: string;
    category: string;
    avgSalary: string;
    competition: string;
    competitionScore: number;
    growth: string;
    skills: string[];
    duration: string;
    roi: number;
    demandTrend: string;
    jobOpenings: string;
    description: string;
    topRoles: string[];
    certifications: string[];
    sources: { title: string; link: string; domain: string }[];
}

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    source: string;
}

const interests = [
    { value: 'all', label: 'All Fields', icon: Brain },
    { value: 'Technology', label: 'Technology', icon: Award },
    { value: 'Design', label: 'Design', icon: Lightbulb },
    { value: 'Marketing', label: 'Marketing', icon: TrendingUp },
    { value: 'Healthcare', label: 'Healthcare', icon: Users },
    { value: 'Engineering', label: 'Engineering', icon: BarChart3 },
    { value: 'Business', label: 'Business', icon: DollarSign }
];

export const AIAssistant = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInterest, setSelectedInterest] = useState('all');
    const [sortBy, setSortBy] = useState('roi');
    const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');


    const searchWeb = async (query: string): Promise<SearchResult[]> => {
        const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
        const cxId = import.meta.env.VITE_GOOGLE_CX_ID;

        if (!apiKey || !cxId) {
            console.error('Google Search API keys are missing');
            return [];
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query + ' career salary job outlook skills')}`
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

    const generateCoursesWithAI = async (query: string, searchResults: SearchResult[]) => {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) return;

        const context = searchResults.map(r => `Title: ${r.title}\nSource: ${r.source}\nSnippet: ${r.snippet}`).join('\n\n');

        const prompt = `
            Based on the user query "${query}" and the search results below, generate a comprehensive list of 12-15 relevant career paths or courses.
            Ensure the results are diverse and cover various aspects of the query, including emerging and niche fields if relevant.
            Return ONLY a valid JSON array matching this structure for each item:
            {
                "id": number,
                "name": "string (Career Name)",
                "category": "string (Technology, Design, Business, Healthcare, Engineering, or Marketing)",
                "avgSalary": "string (e.g. $90,000 - $120,000)",
                "competition": "string (Low, Medium, or High)",
                "competitionScore": number (0-100, lower is better),
                "growth": "string (e.g. +25%)",
                "skills": ["string", "string"],
                "duration": "string (e.g. 6-12 months)",
                "roi": number (0-100),
                "demandTrend": "string (e.g. Rising Fast)",
                "jobOpenings": "string (e.g. 50,000+)",
                "description": "string (brief summary)",
                "topRoles": ["string", "string"],
                "certifications": ["string", "string"],
                "sources": [
                    { "title": "string (Title)", "link": "string (URL)", "domain": "string (e.g. linkedin.com)" }
                ]
            }

            Search Context:
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
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'You are a career data expert. Output ONLY valid JSON array. No markdown blocks.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.5,
                    max_tokens: 4500
                })
            });

            if (!response.ok) throw new Error('AI generation failed');
            const data = await response.json();
            const content = data.choices[0].message.content;

            // Clean up potentially malformed JSON (remove markdown code blocks if present)
            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            const generatedCourses = JSON.parse(jsonStr);

            // Ensure IDs are unique and numbered correctly
            return generatedCourses.map((c: any, index: number) => ({ ...c, id: Date.now() + index }));
        } catch (error) {
            console.error('AI Error:', error);
            return [];
        }
    };

    const handleSearch = async (e?: React.KeyboardEvent | React.MouseEvent) => {
        if (e && 'key' in e && e.key !== 'Enter') return;
        if (!searchQuery.trim()) return;

        setLoading(true);
        setCourses([]); // Clear previous results
        setCourses([]); // Clear previous results

        try {
            setLoadingStep('Searching live market data...');
            const results = await searchWeb(searchQuery);

            setLoadingStep('Analyzing with AI models...');
            const aiCourses = await generateCoursesWithAI(searchQuery, results);

            if (aiCourses && aiCourses.length > 0) {
                setCourses(aiCourses);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
            setLoadingStep('');
        }
    };





    const filteredCourses = courses
        .filter(course =>
            (selectedInterest === 'all' || course.category === selectedInterest)
        )
        .sort((a, b) => {
            if (sortBy === 'roi') return b.roi - a.roi;
            if (sortBy === 'competition') return a.competitionScore - b.competitionScore;
            // Simple salary parsing for sorting
            const getSal = (s: string) => parseInt(s.replace(/[^0-9]/g, '')) || 0;
            if (sortBy === 'salary') return getSal(b.avgSalary) - getSal(a.avgSalary);
            return 0;
        });

    const getCompetitionColor = (score: number) => {
        if (score < 40) return 'text-green-400 bg-green-400/10';
        if (score < 60) return 'text-yellow-400 bg-yellow-400/10';
        return 'text-red-400 bg-red-400/10';
    };

    const getROIColor = (roi: number) => {
        if (roi >= 90) return 'text-green-400';
        if (roi >= 75) return 'text-blue-400';
        return 'text-gray-400';
    };

    return (
        <div className="min-h-screen bg-[#0e1621] text-white selection:bg-[#10b981]/30">
            <Helmet>
                <title>Guide Light - Live Career Pathfinder</title>
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
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Career Path Finder</h1>
                                <p className="text-sm text-gray-500">Live Market Data • AI-Powered Insights</p>
                            </div>
                        </div>
                    </div>


                    <button
                        onClick={() => navigate('/ask-ai')}
                        className="px-4 py-2 bg-[#2a3544] hover:bg-[#374151] text-white rounded-xl font-medium transition-all flex items-center gap-2 border border-[#3a4554] hover:border-[#10b981]"
                    >
                        <Bot className="w-5 h-5 text-[#10b981]" />
                        <span>Ask AI</span>
                    </button>
                </div>


            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Search and Filter Section */}
                <div className="bg-[#1a2332] rounded-2xl shadow-xl p-6 mb-8 border border-[#2a3544]">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Search Bar */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Search Courses or Skills</label>
                            <div className="relative flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        placeholder="e.g., Python, Data Science, Cloud..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearch}
                                        className="w-full pl-10 pr-4 py-3 bg-[#0e1621] border border-[#2a3544] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all"
                                    />
                                </div>
                                <button
                                    onClick={(e) => handleSearch(e)}
                                    disabled={loading}
                                    className="px-6 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0e1621] border border-[#2a3544] rounded-xl text-white outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                            >
                                <option value="roi">Best ROI</option>
                                <option value="competition">Lowest Competition</option>
                                <option value="salary">Highest Salary</option>
                            </select>
                        </div>
                    </div>

                    {/* Interest Filters */}
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-400 mb-3">Filter by Interest</label>
                        <div className="flex flex-wrap gap-2">
                            {interests.map(interest => {
                                const Icon = interest.icon;
                                return (
                                    <button
                                        key={interest.value}
                                        onClick={() => setSelectedInterest(interest.value)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${selectedInterest === interest.value
                                            ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20'
                                            : 'bg-[#0e1621] text-gray-400 hover:bg-[#2a3544] border border-[#2a3544]'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        <span className="text-sm font-medium">{interest.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-24 bg-[#1a2332] rounded-3xl border border-[#2a3544] animate-pulse">
                        <div className="w-20 h-20 bg-[#0e1621] rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Bot className="w-10 h-10 text-[#10b981] animate-bounce" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{loadingStep}</h3>
                        <p className="text-gray-400">Gathering global market intelligence...</p>
                    </div>
                ) : (
                    <>
                        {/* AI Insights Panel */}
                        {courses.length > 0 && (
                            <div className="grid md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white rounded-2xl p-6 shadow-xl transform hover:scale-[1.02] transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <TrendingUp size={24} />
                                        <h3 className="font-bold">Top Recommendation</h3>
                                    </div>
                                    <p className="text-emerald-50 text-sm">
                                        {courses[0]?.name} shows the strongest combined ROI and growth potential.
                                    </p>
                                </div>
                                <div className="bg-[#1a2332] border border-[#2a3544] text-white rounded-2xl p-6 shadow-xl transform hover:scale-[1.02] transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Users size={24} className="text-[#10b981]" />
                                        <h3 className="font-bold">Most In-Demand</h3>
                                    </div>
                                    <p className="text-gray-400 text-sm">
                                        {courses.sort((a, b) => parseInt(b.jobOpenings.replace(/[^0-9]/g, '')) - parseInt(a.jobOpenings.replace(/[^0-9]/g, '')))[0]?.name} has the highest volume of open roles.
                                    </p>
                                </div>
                                <div className="bg-[#1a2332] border border-[#2a3544] text-white rounded-2xl p-6 shadow-xl transform hover:scale-[1.02] transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <DollarSign size={24} className="text-[#10b981]" />
                                        <h3 className="font-bold">Highest Salary</h3>
                                    </div>
                                    <p className="text-gray-400 text-sm">
                                        {courses.sort((a, b) => parseInt(b.avgSalary.replace(/[^0-9]/g, '')) - parseInt(a.avgSalary.replace(/[^0-9]/g, '')))[0]?.name} offers the best earning potential.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Results Count */}
                        <div className="mb-6 flex items-center gap-4">
                            <p className="text-gray-400 text-sm">
                                Showing <span className="font-bold text-white">{filteredCourses.length}</span> career paths based on live data
                            </p>
                            <div className="h-px bg-[#2a3544] flex-1" />
                        </div>

                        {/* Course Cards */}
                        <div className="space-y-6">
                            {filteredCourses.map(course => (
                                <div key={course.id} className="bg-[#1a2332] rounded-2xl shadow-xl overflow-hidden border border-[#2a3544] hover:border-[#10b981]/30 transition-all group">
                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <h3 className="text-2xl font-bold text-white group-hover:text-[#10b981] transition-colors">{course.name}</h3>
                                                    <span className="px-3 py-1 bg-[#10b981]/10 text-[#10b981] rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                        {course.category}
                                                    </span>
                                                </div>
                                                <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">{course.description}</p>
                                            </div>

                                            <div className={`px-5 py-3 rounded-xl font-black text-2xl flex flex-col items-end bg-[#0e1621] border border-[#2a3544]`}>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Success ROI</span>
                                                <span className={getROIColor(course.roi)}>{course.roi}%</span>
                                            </div>
                                        </div>

                                        {/* Key Metrics Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-[#0e1621] rounded-xl p-4 border border-[#2a3544]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <DollarSign size={16} className="text-emerald-500" />
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg Salary</p>
                                                </div>
                                                <p className="text-sm font-bold text-white">{course.avgSalary}</p>
                                            </div>

                                            <div className="bg-[#0e1621] rounded-xl p-4 border border-[#2a3544]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users size={16} className="text-blue-500" />
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Competition</p>
                                                </div>
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase ${getCompetitionColor(course.competitionScore)}`}>
                                                    {course.competition}
                                                </span>
                                            </div>

                                            <div className="bg-[#0e1621] rounded-xl p-4 border border-[#2a3544]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <TrendingUp size={16} className="text-purple-500" />
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Growth Rate</p>
                                                </div>
                                                <p className="text-sm font-bold text-[#10b981]">{course.growth}</p>
                                            </div>

                                            <div className="bg-[#0e1621] rounded-xl p-4 border border-[#2a3544]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <BarChart3 size={16} className="text-orange-500" />
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Job Openings</p>
                                                </div>
                                                <p className="text-sm font-bold text-white">{course.jobOpenings}</p>
                                            </div>
                                        </div>

                                        {/* Skills */}
                                        <div className="mb-6">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Core Stack:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {course.skills.map(skill => (
                                                    <span key={skill} className="px-3 py-1.5 bg-[#2a3544] text-gray-300 rounded-lg text-xs font-medium border border-[#3a4554]">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Expand/Collapse Button */}
                                        <button
                                            onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-[#0e1621] border border-[#2a3544] rounded-xl text-gray-400 hover:text-white hover:bg-[#252f3f] font-medium transition-all"
                                        >
                                            {expandedCourse === course.id ? (
                                                <>
                                                    <ChevronUp size={18} />
                                                    <span className="text-sm">Collapse Overview</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown size={18} />
                                                    <span className="text-sm">Explore Career Blueprint</span>
                                                </>
                                            )}
                                        </button>

                                        {/* Expanded Details */}
                                        {expandedCourse === course.id && (
                                            <div className="mt-6 pt-6 border-t border-[#2a3544] space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                                <div className="grid md:grid-cols-2 gap-8">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-[#10b981] uppercase tracking-widest mb-4">Strategic Roles:</h4>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {course.topRoles.map(role => (
                                                                <div key={role} className="px-4 py-3 bg-[#0e1621] text-gray-200 rounded-xl font-medium border border-[#2a3544] flex items-center gap-3">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                                                    {role}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-4">Industry Credentials:</h4>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {course.certifications.map(cert => (
                                                                <div key={cert} className="px-4 py-3 bg-[#0e1621] text-gray-300 rounded-xl text-xs border border-[#2a3544] flex items-center gap-3">
                                                                    <Sparkles className="w-4 h-4 text-orange-400" />
                                                                    {cert}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div className="bg-[#10b981]/5 rounded-2xl p-5 border border-[#10b981]/20">
                                                        <p className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em] mb-2">Learning Path</p>
                                                        <p className="text-xl font-bold text-white">{course.duration}</p>
                                                    </div>
                                                    <div className="bg-purple-500/5 rounded-2xl p-5 border border-purple-500/20">
                                                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2">Market Velocity</p>
                                                        <p className="text-xl font-bold text-white uppercase">{course.demandTrend}</p>
                                                    </div>
                                                </div>

                                                {/* Sources Section */}
                                                {course.sources && course.sources.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Data Sources:</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {course.sources.map((source, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={source.link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-3 px-4 py-3 bg-[#0e1621] text-gray-300 rounded-xl text-xs border border-[#2a3544] hover:border-blue-400/50 hover:text-blue-400 transition-all group/link"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-[#1a2332] flex items-center justify-center flex-shrink-0 text-blue-400 group-hover/link:text-white transition-colors">
                                                                        <Link2 size={14} />
                                                                    </div>
                                                                    <div className="flex flex-col overflow-hidden">
                                                                        <span className="font-bold text-white truncate">{source.domain}</span>
                                                                        <span className="text-gray-500 truncate text-[10px]">{source.title}</span>
                                                                    </div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <button className="w-full py-4 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#10b981]/20 transform hover:scale-[1.01] transition-all">
                                                    Unlock Full AI Analysis
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredCourses.length === 0 && !loading && (
                            <div className="text-center py-24 bg-[#1a2332] rounded-3xl border border-[#2a3544]">
                                <div className="w-20 h-20 bg-[#0e1621] rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <Search className="w-10 h-10 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
                                <p className="text-gray-400">Try adjusting your filters or search terms.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
