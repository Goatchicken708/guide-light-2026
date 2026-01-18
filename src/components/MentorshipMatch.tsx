import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { X, UserPlus, Briefcase, School, Star, Search, Filter, MessageCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface MentorProfile {
    id: string;
    username: string;
    avatar_url?: string;
    role: 'teacher' | 'professional';
    online: boolean;
    bio?: string;
    skills?: string[];
}

interface MentorshipMatchProps {
    isOpen: boolean;
    onClose: () => void;
    onStartChat: (user: any) => void;
}

const getColorForUser = (userId: string): string => {
    const colors = [
        '#667eea', '#f093fb', '#4facfe', '#fa709a', '#a8edea',
        '#ff9a9e', '#ffecd2', '#a1c4fd', '#e0c3fc', '#fbc2eb'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

export const MentorshipMatch: React.FC<MentorshipMatchProps> = ({ isOpen, onClose, onStartChat }) => {
    const { user } = useAuth();
    const [mentors, setMentors] = useState<MentorProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<'all' | 'teacher' | 'professional'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const fetchMentors = async () => {
            setLoading(true);
            try {
                const profilesRef = collection(db, 'profiles');
                // Get all users who are teachers or professionals
                // Firestore doesn't support logical OR for different values in a single query easily in one go for efficient filtering without multiple queries or client-side filtering.
                // We'll fetch separately or fetch all and filter client side if dataset is small.
                // Given standard constraints, let's query for each or just get 'where role in [...]' if possible.
                // 'in' query works for up to 10 values.

                const q = query(
                    profilesRef,
                    where('role', 'in', ['teacher', 'professional'])
                );

                const snapshot = await getDocs(q);
                const fetchedMentors = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as MentorProfile))
                    .filter(m => m.id !== user?.uid); // Exclude self

                setMentors(fetchedMentors);
            } catch (error) {
                console.error('Error fetching mentors:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMentors();
    }, [isOpen, user]);

    const filteredMentors = mentors.filter(mentor => {
        const matchesRole = filterRole === 'all' || mentor.role === filterRole;
        const matchesSearch = mentor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            mentor.bio?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRole && matchesSearch;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a2332] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-[#2a3544] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-[#2a3544] flex items-center justify-between bg-[#0e1621]">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-400" />
                            Find a Mentor
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Connect with educators and professionals to guide your journey</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#2a3544] transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-[#2a3544] bg-[#1a2332] space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name or skills..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[#0e1621] border border-[#2a3544] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#8B7FFF] transition-colors"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterRole('all')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterRole === 'all'
                                        ? 'bg-[#8B7FFF] text-white'
                                        : 'bg-[#0e1621] text-gray-400 hover:bg-[#2a3544]'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterRole('teacher')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${filterRole === 'teacher'
                                        ? 'bg-[#8B7FFF] text-white'
                                        : 'bg-[#0e1621] text-gray-400 hover:bg-[#2a3544]'
                                    }`}
                            >
                                <School className="w-4 h-4" />
                                Teachers
                            </button>
                            <button
                                onClick={() => setFilterRole('professional')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${filterRole === 'professional'
                                        ? 'bg-[#8B7FFF] text-white'
                                        : 'bg-[#0e1621] text-gray-400 hover:bg-[#2a3544]'
                                    }`}
                            >
                                <Briefcase className="w-4 h-4" />
                                Professionals
                            </button>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#0e1621]">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-8 h-8 border-4 border-[#8B7FFF] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredMentors.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-[#1a2332] rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No mentors found</h3>
                            <p className="text-gray-400">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMentors.map((mentor) => (
                                <div
                                    key={mentor.id}
                                    className="bg-[#1a2332] border border-[#2a3544] rounded-xl p-5 hover:border-[#8B7FFF]/50 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            {mentor.avatar_url ? (
                                                <img
                                                    src={mentor.avatar_url}
                                                    alt={mentor.username}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                                                    style={{ backgroundColor: getColorForUser(mentor.id) }}
                                                >
                                                    {mentor.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-white group-hover:text-[#8B7FFF] transition-colors">
                                                    {mentor.username}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {mentor.role === 'teacher' ? (
                                                        <span className="flex items-center gap-1 text-xs text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded-full">
                                                            <School className="w-3 h-3" />
                                                            Educator
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">
                                                            <Briefcase className="w-3 h-3" />
                                                            Professional
                                                        </span>
                                                    )}
                                                    {mentor.online && (
                                                        <span className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {mentor.bio && (
                                            <p className="text-sm text-gray-400 line-clamp-2">
                                                {mentor.bio}
                                            </p>
                                        )}

                                        <button
                                            onClick={() => onStartChat(mentor)}
                                            className="w-full py-2 bg-[#8B7FFF]/10 text-[#8B7FFF] border border-[#8B7FFF]/20 rounded-lg hover:bg-[#8B7FFF] hover:text-white font-medium transition-all flex items-center justify-center gap-2"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Start Chat
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
