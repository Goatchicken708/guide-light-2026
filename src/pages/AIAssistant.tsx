import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Users, DollarSign, Award, Brain, BarChart3, Lightbulb, ChevronDown, ChevronUp, Bot, ArrowLeft, Sparkles } from 'lucide-react';

const courses = [
    {
        id: 1,
        name: "Data Science & AI",
        category: "Technology",
        avgSalary: "$95,000 - $140,000",
        competition: "Medium",
        competitionScore: 60,
        growth: "+35%",
        skills: ["Python", "Machine Learning", "Statistics", "SQL"],
        duration: "6-12 months",
        roi: 95,
        demandTrend: "Rising Fast",
        jobOpenings: "125,000+",
        description: "High demand across industries with AI revolution. Entry barrier lowered with bootcamps.",
        topRoles: ["Data Scientist", "ML Engineer", "AI Researcher"],
        certifications: ["Google Data Analytics", "IBM Data Science", "AWS ML Specialty"]
    },
    {
        id: 2,
        name: "Cybersecurity",
        category: "Technology",
        avgSalary: "$90,000 - $150,000",
        competition: "Low",
        competitionScore: 35,
        growth: "+33%",
        skills: ["Network Security", "Ethical Hacking", "Cloud Security", "Compliance"],
        duration: "4-8 months",
        roi: 98,
        demandTrend: "Critical Shortage",
        jobOpenings: "750,000+",
        description: "Severe talent shortage with increasing cyber threats. High job security.",
        topRoles: ["Security Analyst", "Penetration Tester", "CISO"],
        certifications: ["CompTIA Security+", "CEH", "CISSP"]
    },
    {
        id: 3,
        name: "Cloud Architecture (AWS/Azure)",
        category: "Technology",
        avgSalary: "$110,000 - $160,000",
        competition: "Low-Medium",
        competitionScore: 45,
        growth: "+28%",
        skills: ["AWS", "Azure", "DevOps", "Kubernetes"],
        duration: "5-10 months",
        roi: 92,
        demandTrend: "Extremely High",
        jobOpenings: "200,000+",
        description: "Cloud migration is mandatory for businesses. Shortage of certified professionals.",
        topRoles: ["Cloud Architect", "DevOps Engineer", "Solutions Architect"],
        certifications: ["AWS Solutions Architect", "Azure Administrator", "GCP Professional"]
    },
    {
        id: 4,
        name: "UX/UI Design",
        category: "Design",
        avgSalary: "$70,000 - $120,000",
        competition: "Medium-High",
        competitionScore: 65,
        growth: "+22%",
        skills: ["Figma", "User Research", "Prototyping", "Design Thinking"],
        duration: "3-6 months",
        roi: 78,
        demandTrend: "Steady Growth",
        jobOpenings: "85,000+",
        description: "Every digital product needs UX. Portfolio matters more than degree.",
        topRoles: ["UX Designer", "Product Designer", "UX Researcher"],
        certifications: ["Google UX Design", "Nielsen Norman Group", "Interaction Design Foundation"]
    },
    {
        id: 5,
        name: "Blockchain Development",
        category: "Technology",
        avgSalary: "$100,000 - $180,000",
        competition: "Low",
        competitionScore: 30,
        growth: "+40%",
        skills: ["Solidity", "Web3", "Smart Contracts", "Cryptography"],
        duration: "6-12 months",
        roi: 88,
        demandTrend: "Explosive Growth",
        jobOpenings: "45,000+",
        description: "Very few qualified developers. Web3 and DeFi expansion creating massive demand.",
        topRoles: ["Blockchain Developer", "Smart Contract Engineer", "Web3 Developer"],
        certifications: ["Certified Blockchain Developer", "Ethereum Developer", "Hyperledger"]
    },
    {
        id: 6,
        name: "Digital Marketing & SEO",
        category: "Marketing",
        avgSalary: "$55,000 - $95,000",
        competition: "High",
        competitionScore: 75,
        growth: "+18%",
        skills: ["SEO", "Google Ads", "Analytics", "Content Strategy"],
        duration: "2-4 months",
        roi: 65,
        demandTrend: "Moderate Growth",
        jobOpenings: "150,000+",
        description: "Lower barrier to entry but saturated market. Specialization is key.",
        topRoles: ["SEO Specialist", "Digital Marketer", "Growth Hacker"],
        certifications: ["Google Ads", "HubSpot", "Meta Blueprint"]
    },
    {
        id: 7,
        name: "Healthcare Data Analytics",
        category: "Healthcare",
        avgSalary: "$85,000 - $130,000",
        competition: "Low",
        competitionScore: 40,
        growth: "+30%",
        skills: ["Healthcare Systems", "Data Analysis", "HIPAA", "Clinical Informatics"],
        duration: "6-9 months",
        roi: 90,
        demandTrend: "Growing Fast",
        jobOpenings: "60,000+",
        description: "Healthcare digitization creating huge demand. Niche field with less competition.",
        topRoles: ["Healthcare Data Analyst", "Clinical Informaticist", "Health IT Specialist"],
        certifications: ["CAHIMS", "Healthcare Analytics", "Epic Certification"]
    },
    {
        id: 8,
        name: "Renewable Energy Engineering",
        category: "Engineering",
        avgSalary: "$75,000 - $125,000",
        competition: "Medium",
        competitionScore: 50,
        growth: "+25%",
        skills: ["Solar Systems", "Wind Energy", "Energy Modeling", "Sustainability"],
        duration: "8-12 months",
        roi: 82,
        demandTrend: "Accelerating",
        jobOpenings: "55,000+",
        description: "Green energy transition is urgent. Government incentives boosting sector.",
        topRoles: ["Solar Engineer", "Energy Analyst", "Sustainability Consultant"],
        certifications: ["NABCEP", "LEED", "Energy Manager"]
    },
    {
        id: 9,
        name: "Product Management",
        category: "Business",
        avgSalary: "$95,000 - $150,000",
        competition: "Medium-High",
        competitionScore: 68,
        growth: "+20%",
        skills: ["Product Strategy", "Agile", "User Stories", "Analytics"],
        duration: "4-8 months",
        roi: 75,
        demandTrend: "Strong Demand",
        jobOpenings: "95,000+",
        description: "Tech companies need PMs, but field is competitive. Experience valued highly.",
        topRoles: ["Product Manager", "Product Owner", "Technical PM"],
        certifications: ["Certified Scrum Product Owner", "Pragmatic Marketing", "Product School"]
    },
    {
        id: 10,
        name: "Robotics & Automation",
        category: "Engineering",
        avgSalary: "$90,000 - $140,000",
        competition: "Low-Medium",
        competitionScore: 42,
        growth: "+24%",
        skills: ["ROS", "Computer Vision", "Control Systems", "Python"],
        duration: "8-14 months",
        roi: 86,
        demandTrend: "Rising Steadily",
        jobOpenings: "40,000+",
        description: "Manufacturing automation and AI robotics creating new opportunities.",
        topRoles: ["Robotics Engineer", "Automation Specialist", "Controls Engineer"],
        certifications: ["Certified Automation Professional", "ROS Developer", "PLC Programming"]
    }
];

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

    const filteredCourses = courses
        .filter(course =>
            (selectedInterest === 'all' || course.category === selectedInterest) &&
            (searchQuery === '' ||
                course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
                course.category.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortBy === 'roi') return b.roi - a.roi;
            if (sortBy === 'competition') return a.competitionScore - b.competitionScore;
            if (sortBy === 'salary') return parseInt(b.avgSalary.replace(/[^0-9]/g, '')) - parseInt(a.avgSalary.replace(/[^0-9]/g, ''));
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
                <title>Guide Light - Career Path Finder</title>
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
                                <p className="text-sm text-gray-500">AI-Powered Course Analytics • High ROI Careers</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Search and Filter Section */}
                <div className="bg-[#1a2332] rounded-2xl shadow-xl p-6 mb-8 border border-[#2a3544]">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Search Bar */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Search Courses or Skills</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                <input
                                    type="text"
                                    placeholder="e.g., Python, Data Science, Cloud..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-[#0e1621] border border-[#2a3544] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all"
                                />
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

                {/* AI Insights Panel */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-[#10b981] to-[#059669] text-white rounded-2xl p-6 shadow-xl transform hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp size={24} />
                            <h3 className="font-bold">AI Recommendation</h3>
                        </div>
                        <p className="text-emerald-50 text-sm">Cybersecurity has the best opportunity-to-competition ratio right now</p>
                    </div>
                    <div className="bg-[#1a2332] border border-[#2a3544] text-white rounded-2xl p-6 shadow-xl transform hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <Users size={24} className="text-[#10b981]" />
                            <h3 className="font-bold">Market Trend</h3>
                        </div>
                        <p className="text-gray-400 text-sm">Tech skills have 3x more job openings than qualified candidates</p>
                    </div>
                    <div className="bg-[#1a2332] border border-[#2a3544] text-white rounded-2xl p-6 shadow-xl transform hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign size={24} className="text-[#10b981]" />
                            <h3 className="font-bold">Salary Insight</h3>
                        </div>
                        <p className="text-gray-400 text-sm">Cloud & Blockchain roles offer highest starting salaries</p>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mb-6 flex items-center gap-4">
                    <p className="text-gray-400 text-sm">
                        Showing <span className="font-bold text-white">{filteredCourses.length}</span> career paths
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

                                        <button className="w-full py-4 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#10b981]/20 transform hover:scale-[1.01] transition-all">
                                            Unlock Full AI Analysis
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredCourses.length === 0 && (
                    <div className="text-center py-24 bg-[#1a2332] rounded-3xl border border-[#2a3544]">
                        <div className="w-20 h-20 bg-[#0e1621] rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
                        <p className="text-gray-400">Try adjusting your filters or search terms.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
