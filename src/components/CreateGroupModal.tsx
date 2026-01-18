import React, { useState, useEffect } from 'react';
import { X, Search, Users, Check, Loader2, Camera } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';

interface Profile {
    id: string;
    username: string;
    avatar_url?: string;
    online: boolean;
}

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGroupCreated?: (groupId: string) => void;
}

const getColorForUser = (userId: string): string => {
    const colors = [
        '#667eea', '#f093fb', '#4facfe', '#fa709a', '#a8edea',
        '#ff9a9e', '#ffecd2', '#a1c4fd', '#e0c3fc', '#fbc2eb'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onGroupCreated }) => {
    const [step, setStep] = useState<'select' | 'details'>(1 === 1 ? 'select' : 'details');
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<Profile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const currentUser = auth.currentUser;

    // Fetch all users
    useEffect(() => {
        if (!isOpen) return;

        const fetchUsers = async () => {
            try {
                const profilesRef = collection(db, 'profiles');
                const snapshot = await getDocs(profilesRef);
                const allUsers = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
                    .filter(u => u.id !== currentUser?.uid);
                setUsers(allUsers);
                setFilteredUsers(allUsers);
            } catch (err) {
                console.error('Error fetching users:', err);
            }
        };

        fetchUsers();
    }, [isOpen, currentUser]);

    // Filter users based on search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(users);
            return;
        }

        const query = searchQuery.toLowerCase();
        setFilteredUsers(
            users.filter(u => u.username?.toLowerCase().includes(query))
        );
    }, [searchQuery, users]);

    const toggleUserSelection = (user: Profile) => {
        setSelectedUsers(prev => {
            const isSelected = prev.some(u => u.id === user.id);
            if (isSelected) {
                return prev.filter(u => u.id !== user.id);
            } else {
                return [...prev, user];
            }
        });
    };

    const handleNext = () => {
        if (selectedUsers.length < 1) {
            setError('Please select at least 1 member');
            return;
        }
        setError('');
        setStep('details');
    };

    const handleBack = () => {
        setStep('select');
        setError('');
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            setError('Please enter a group name');
            return;
        }

        if (!currentUser) {
            setError('You must be logged in');
            return;
        }

        setCreating(true);
        setError('');

        try {
            // Create group document
            const groupData = {
                name: groupName.trim(),
                description: groupDescription.trim(),
                avatar_url: '',
                created_by: currentUser.uid,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
                members: [currentUser.uid, ...selectedUsers.map(u => u.id)],
                admins: [currentUser.uid],
                type: 'group'
            };

            const groupRef = await addDoc(collection(db, 'groups'), groupData);

            // Add group members subcollection for easier querying
            const membersData = [
                {
                    userId: currentUser.uid,
                    role: 'admin',
                    joinedAt: Timestamp.now(),
                    username: currentUser.displayName || 'User'
                },
                ...selectedUsers.map(u => ({
                    userId: u.id,
                    role: 'member',
                    joinedAt: Timestamp.now(),
                    username: u.username
                }))
            ];

            for (const member of membersData) {
                await setDoc(doc(db, 'groups', groupRef.id, 'members', member.userId), member);
            }

            // Send system message
            await addDoc(collection(db, 'group_messages'), {
                group_id: groupRef.id,
                content: `${currentUser.displayName || 'User'} created this group`,
                sender_id: 'system',
                type: 'system',
                created_at: Timestamp.now()
            });

            onGroupCreated?.(groupRef.id);
            handleClose();
        } catch (err) {
            console.error('Error creating group:', err);
            setError('Failed to create group. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const handleClose = () => {
        setStep('select');
        setSearchQuery('');
        setSelectedUsers([]);
        setGroupName('');
        setGroupDescription('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-[#1a2332] rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl border border-[#2a3544] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-[#2a3544] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {step === 'details' && (
                                <button
                                    onClick={handleBack}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    ←
                                </button>
                            )}
                            <div className="w-10 h-10 bg-gradient-to-br from-[#8B7FFF] to-[#6366f1] rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">
                                    {step === 'select' ? 'Add Members' : 'Group Details'}
                                </h2>
                                <p className="text-xs text-gray-400">
                                    {step === 'select'
                                        ? `${selectedUsers.length} selected`
                                        : 'Set group name and icon'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#2a3544] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {step === 'select' ? (
                        <>
                            {/* Search */}
                            <div className="px-5 py-3 border-b border-[#2a3544]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-[#0e1621] border border-[#2a3544] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B7FFF] transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Selected Users Chips */}
                            {selectedUsers.length > 0 && (
                                <div className="px-5 py-3 border-b border-[#2a3544] flex flex-wrap gap-2">
                                    {selectedUsers.map(user => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-[#8B7FFF]/20 text-[#8B7FFF] rounded-full text-sm"
                                        >
                                            <span>{user.username}</span>
                                            <button
                                                onClick={() => toggleUserSelection(user)}
                                                className="hover:text-white transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* User List */}
                            <div className="flex-1 overflow-y-auto">
                                {filteredUsers.length === 0 ? (
                                    <div className="px-5 py-12 text-center">
                                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-400">No users found</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(user => {
                                        const isSelected = selectedUsers.some(u => u.id === user.id);
                                        return (
                                            <button
                                                key={user.id}
                                                onClick={() => toggleUserSelection(user)}
                                                className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-[#2a3544]/50 transition-colors ${isSelected ? 'bg-[#8B7FFF]/10' : ''
                                                    }`}
                                            >
                                                <div className="relative">
                                                    {user.avatar_url ? (
                                                        <img
                                                            src={user.avatar_url}
                                                            alt={user.username}
                                                            className="w-11 h-11 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                                                            style={{ backgroundColor: getColorForUser(user.id) }}
                                                        >
                                                            {user.username?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    {user.online && (
                                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1a2332] rounded-full" />
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <div className="font-medium text-white">{user.username}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {user.online ? 'online' : 'offline'}
                                                    </div>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-[#8B7FFF] border-[#8B7FFF]'
                                                        : 'border-gray-500'
                                                    }`}>
                                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="px-5 py-2 bg-red-500/10 border-t border-red-500/30">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="px-5 py-4 border-t border-[#2a3544]">
                                <button
                                    onClick={handleNext}
                                    disabled={selectedUsers.length < 1}
                                    className="w-full py-3 bg-gradient-to-r from-[#8B7FFF] to-[#6366f1] text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Next ({selectedUsers.length} selected)
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Group Details Form */}
                            <div className="flex-1 overflow-y-auto px-5 py-6">
                                {/* Group Avatar */}
                                <div className="flex justify-center mb-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-gradient-to-br from-[#8B7FFF] to-[#6366f1] rounded-full flex items-center justify-center">
                                            <Users className="w-10 h-10 text-white" />
                                        </div>
                                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#2a3544] hover:bg-[#3a4554] rounded-full flex items-center justify-center text-white transition-colors border-2 border-[#1a2332]">
                                            <Camera className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Group Name */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Group Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="Enter group name"
                                        className="w-full px-4 py-3 bg-[#0e1621] border border-[#2a3544] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#8B7FFF] transition-colors"
                                        maxLength={50}
                                    />
                                </div>

                                {/* Group Description */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={groupDescription}
                                        onChange={(e) => setGroupDescription(e.target.value)}
                                        placeholder="What is this group about?"
                                        className="w-full px-4 py-3 bg-[#0e1621] border border-[#2a3544] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#8B7FFF] transition-colors resize-none"
                                        rows={3}
                                        maxLength={200}
                                    />
                                </div>

                                {/* Members Preview */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Members ({selectedUsers.length + 1})
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1621] rounded-full text-sm text-gray-300">
                                            <span>You (Admin)</span>
                                        </div>
                                        {selectedUsers.map(user => (
                                            <div
                                                key={user.id}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1621] rounded-full text-sm text-gray-300"
                                            >
                                                <span>{user.username}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="px-5 py-2 bg-red-500/10 border-t border-red-500/30">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="px-5 py-4 border-t border-[#2a3544]">
                                <button
                                    onClick={handleCreateGroup}
                                    disabled={creating || !groupName.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-[#8B7FFF] to-[#6366f1] text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Users className="w-5 h-5" />
                                            Create Group
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
