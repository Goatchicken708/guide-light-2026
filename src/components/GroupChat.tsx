import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Users, UserPlus, Send, Loader2, ArrowLeft, Check, Reply, Crown, LogOut } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    getDocs,
    Timestamp,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    deleteDoc
} from 'firebase/firestore';
import { soundManager } from '../lib/sounds';

interface GroupMember {
    userId: string;
    username: string;
    role: 'admin' | 'member';
    avatar_url?: string;
}

interface GroupMessage {
    id: string;
    group_id: string;
    content: string;
    sender_id: string;
    sender_name?: string;
    type?: 'message' | 'system';
    created_at: any;
    replyTo?: {
        messageId: string;
        content: string;
        senderId: string;
        senderName: string;
    };
}

interface Group {
    id: string;
    name: string;
    description?: string;
    avatar_url?: string;
    members: string[];
    admins: string[];
    created_by: string;
    created_at: any;
}

interface GroupChatProps {
    group: Group;
    onBack: () => void;
    onLeaveGroup?: () => void;
}

const getColorForUser = (userId: string): string => {
    const colors = [
        '#667eea', '#f093fb', '#4facfe', '#fa709a', '#a8edea',
        '#ff9a9e', '#ffecd2', '#a1c4fd', '#e0c3fc', '#fbc2eb'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

export const GroupChat: React.FC<GroupChatProps> = ({ group, onBack, onLeaveGroup }) => {
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [replyToMessage, setReplyToMessage] = useState<GroupMessage | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const currentUser = auth.currentUser;
    const isAdmin = group.admins?.includes(currentUser?.uid || '');

    // Fetch group members
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const membersSnapshot = await getDocs(collection(db, 'groups', group.id, 'members'));
                const membersList: GroupMember[] = [];

                for (const memberDoc of membersSnapshot.docs) {
                    const memberData = memberDoc.data();
                    // Get user profile for avatar
                    const profileDoc = await getDoc(doc(db, 'profiles', memberDoc.id));
                    const profile = profileDoc.data();

                    membersList.push({
                        userId: memberDoc.id,
                        username: memberData.username || profile?.username || 'Unknown',
                        role: memberData.role || 'member',
                        avatar_url: profile?.avatar_url
                    });
                }

                setMembers(membersList);
            } catch (err) {
                console.error('Error fetching members:', err);
            }
        };

        fetchMembers();
    }, [group.id]);

    // Subscribe to group messages
    useEffect(() => {
        const messagesRef = collection(db, 'group_messages');
        const q = query(
            messagesRef,
            where('group_id', '==', group.id),
            orderBy('created_at', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GroupMessage));

            // Play sound for new messages
            if (messages.length > 0 && newMessages.length > messages.length) {
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg.sender_id !== currentUser?.uid && lastMsg.type !== 'system') {
                    soundManager.playReceived();
                }
            }

            setMessages(newMessages);

            // Auto scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        return () => unsubscribe();
    }, [group.id, currentUser]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !currentUser) return;

        setSending(true);
        const messageData: any = {
            group_id: group.id,
            content: newMessage.trim(),
            sender_id: currentUser.uid,
            sender_name: currentUser.displayName || 'User',
            type: 'message',
            created_at: Timestamp.now()
        };

        if (replyToMessage) {
            messageData.replyTo = {
                messageId: replyToMessage.id,
                content: replyToMessage.content,
                senderId: replyToMessage.sender_id,
                senderName: replyToMessage.sender_name || 'User'
            };
        }

        setNewMessage('');
        setReplyToMessage(null);

        try {
            await addDoc(collection(db, 'group_messages'), messageData);
            soundManager.playSent();
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!currentUser || !confirm('Are you sure you want to leave this group?')) return;

        try {
            // Remove from members subcollection
            await deleteDoc(doc(db, 'groups', group.id, 'members', currentUser.uid));

            // Update group members array
            const groupRef = doc(db, 'groups', group.id);
            const groupDoc = await getDoc(groupRef);
            const groupData = groupDoc.data();

            if (groupData) {
                const newMembers = groupData.members.filter((m: string) => m !== currentUser.uid);
                const newAdmins = groupData.admins.filter((a: string) => a !== currentUser.uid);

                await updateDoc(groupRef, {
                    members: newMembers,
                    admins: newAdmins
                });
            }

            // Add system message
            await addDoc(collection(db, 'group_messages'), {
                group_id: group.id,
                content: `${currentUser.displayName || 'User'} left the group`,
                sender_id: 'system',
                type: 'system',
                created_at: Timestamp.now()
            });

            onLeaveGroup?.();
        } catch (err) {
            console.error('Error leaving group:', err);
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const getMemberName = (senderId: string) => {
        const member = members.find(m => m.userId === senderId);
        return member?.username || 'Unknown';
    };

    return (
        <div className="flex flex-col h-full bg-[#121a24]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1a2332] flex items-center justify-between bg-[#0e1621] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1a2332]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 bg-gradient-to-br from-[#8B7FFF] to-[#6366f1] rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="font-medium text-white">{group.name}</div>
                        <div className="text-xs text-gray-400">{members.length} members</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowMembers(true)}
                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1a2332]"
                        title="View members"
                    >
                        <Users className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-[#2a3544] scrollbar-track-transparent"
            >
                {messages.map((msg) => {
                    const isSent = msg.sender_id === currentUser?.uid;
                    const isSystem = msg.type === 'system';

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className="px-4 py-2 bg-[#1a2332]/60 rounded-full text-xs text-gray-400">
                                    {msg.content}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`flex items-end gap-2.5 mb-4 ${isSent ? 'flex-row-reverse' : ''} group`}>
                            {!isSent && (
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                                    style={{ backgroundColor: getColorForUser(msg.sender_id) }}
                                >
                                    {getMemberName(msg.sender_id).charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col max-w-[60%]">
                                {!isSent && (
                                    <span className="text-xs text-[#8B7FFF] font-medium mb-1 px-1">
                                        {msg.sender_name || getMemberName(msg.sender_id)}
                                    </span>
                                )}

                                {/* Reply preview */}
                                {msg.replyTo && (
                                    <div className={`mb-1 px-3 py-2 bg-[#1a2332] rounded-lg text-xs ${isSent ? 'ml-auto' : ''}`}>
                                        <div className="font-semibold text-gray-300 mb-1">
                                            {msg.replyTo.senderName}
                                        </div>
                                        <div className="text-gray-400 truncate">
                                            {msg.replyTo.content.substring(0, 50)}{msg.replyTo.content.length > 50 ? '...' : ''}
                                        </div>
                                    </div>
                                )}

                                <div
                                    className={`relative ${isSent ? 'bg-[#8B7FFF]' : 'bg-[#1a2332]'} text-white px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed break-words ${isSent ? 'rounded-br-sm' : 'rounded-bl-sm'
                                        }`}
                                    style={{ whiteSpace: 'pre-wrap' }}
                                >
                                    {msg.content}

                                    {/* Reply button on hover */}
                                    <button
                                        onClick={() => setReplyToMessage(msg)}
                                        className={`absolute -top-3 ${isSent ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-[#2a3544] hover:bg-[#3a4554] rounded-full`}
                                        title="Reply to message"
                                    >
                                        <Reply className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                                <div className={`text-[11px] text-gray-500 mt-1 px-1 ${isSent ? 'text-right' : ''}`}>
                                    {formatTime(msg.created_at)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-4 py-3 border-t border-[#1a2332] bg-[#0e1621] flex-shrink-0">
                {/* Reply Preview */}
                {replyToMessage && (
                    <div className="mb-3 p-3 bg-[#1a2332] border-l-4 border-l-[#8B7FFF] rounded-lg flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Reply className="w-4 h-4 text-[#8B7FFF] flex-shrink-0" />
                                <span className="text-xs font-medium text-gray-400">
                                    Replying to {replyToMessage.sender_name || getMemberName(replyToMessage.sender_id)}
                                </span>
                            </div>
                            <p className="text-sm text-white truncate">{replyToMessage.content}</p>
                        </div>
                        <button
                            onClick={() => setReplyToMessage(null)}
                            className="ml-2 p-1 hover:bg-[#2a3544] rounded-full transition-colors flex-shrink-0"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder="Type a message..."
                            className="w-full px-4 py-3 bg-[#1a2332] border border-[#2a3544] rounded-[20px] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B7FFF] transition-all resize-none overflow-auto"
                            style={{ minHeight: '40px', maxHeight: '200px', lineHeight: '1.5' }}
                            disabled={sending}
                            rows={1}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-11 h-11 mb-2 bg-[#8B7FFF] text-white rounded-full flex items-center justify-center hover:bg-[#7B6FEF] disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>

            {/* Members Modal */}
            {showMembers && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={() => setShowMembers(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1a2332] rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl border border-[#2a3544] overflow-hidden">
                            <div className="px-5 py-4 border-b border-[#2a3544] flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">Group Members</h2>
                                <button
                                    onClick={() => setShowMembers(false)}
                                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#2a3544] transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {members.map(member => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-[#2a3544]/50 transition-colors"
                                    >
                                        {member.avatar_url ? (
                                            <img
                                                src={member.avatar_url}
                                                alt={member.username}
                                                className="w-11 h-11 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                                                style={{ backgroundColor: getColorForUser(member.userId) }}
                                            >
                                                {member.username?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="font-medium text-white flex items-center gap-2">
                                                {member.username}
                                                {member.role === 'admin' && (
                                                    <Crown className="w-4 h-4 text-yellow-500" />
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="px-5 py-4 border-t border-[#2a3544] space-y-2">
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            setShowMembers(false);
                                            setShowAddMember(true);
                                        }}
                                        className="w-full py-2.5 bg-[#8B7FFF]/20 text-[#8B7FFF] font-medium rounded-xl hover:bg-[#8B7FFF]/30 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                        Add Members
                                    </button>
                                )}
                                <button
                                    onClick={handleLeaveGroup}
                                    className="w-full py-2.5 bg-red-500/20 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Leave Group
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Add Member Modal */}
            {showAddMember && (
                <AddMemberModal
                    groupId={group.id}
                    existingMembers={members.map(m => m.userId)}
                    onClose={() => setShowAddMember(false)}
                />
            )}
        </div>
    );
};

// Add Member Modal Component
interface AddMemberModalProps {
    groupId: string;
    existingMembers: string[];
    onClose: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ groupId, existingMembers, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [adding, setAdding] = useState(false);

    const currentUser = auth.currentUser;

    useEffect(() => {
        const fetchUsers = async () => {
            const profilesRef = collection(db, 'profiles');
            const snapshot = await getDocs(profilesRef);
            const allUsers = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => u.id !== currentUser?.uid && !existingMembers.includes(u.id));
            setUsers(allUsers);
        };
        fetchUsers();
    }, [existingMembers, currentUser]);

    const filteredUsers = searchQuery.trim()
        ? users.filter(u => u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
        : users;

    const handleAddMembers = async () => {
        if (selectedUsers.length === 0 || !currentUser) return;

        setAdding(true);
        try {
            const groupRef = doc(db, 'groups', groupId);

            // Add to members array
            await updateDoc(groupRef, {
                members: arrayUnion(...selectedUsers)
            });

            // Add member documents
            for (const userId of selectedUsers) {
                const user = users.find(u => u.id === userId);
                await addDoc(collection(db, 'groups', groupId, 'members'), {
                    id: '',
                });

                // Actually set the document with the user ID as the document ID
                const memberRef = doc(db, 'groups', groupId, 'members', userId);
                await updateDoc(memberRef, {
                    userId,
                    username: user?.username || 'Unknown',
                    role: 'member',
                    joinedAt: Timestamp.now()
                }).catch(() => {
                    // If document doesn't exist, create it
                    return addDoc(collection(db, 'groups', groupId, 'members'), {
                        userId,
                        username: user?.username || 'Unknown',
                        role: 'member',
                        joinedAt: Timestamp.now()
                    });
                });
            }

            // Send system message
            const addedNames = selectedUsers.map(id => users.find(u => u.id === id)?.username || 'User').join(', ');
            await addDoc(collection(db, 'group_messages'), {
                group_id: groupId,
                content: `${currentUser.displayName || 'User'} added ${addedNames}`,
                sender_id: 'system',
                type: 'system',
                created_at: Timestamp.now()
            });

            onClose();
        } catch (err) {
            console.error('Error adding members:', err);
        } finally {
            setAdding(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-[#1a2332] rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl border border-[#2a3544] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#2a3544] flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Add Members</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-[#2a3544] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

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

                    <div className="flex-1 overflow-y-auto">
                        {filteredUsers.map(user => {
                            const isSelected = selectedUsers.includes(user.id);
                            return (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        setSelectedUsers(prev =>
                                            isSelected ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                        );
                                    }}
                                    className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-[#2a3544]/50 transition-colors ${isSelected ? 'bg-[#8B7FFF]/10' : ''
                                        }`}
                                >
                                    <div
                                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                                        style={{ backgroundColor: getColorForUser(user.id) }}
                                    >
                                        {user.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium text-white">{user.username}</div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#8B7FFF] border-[#8B7FFF]' : 'border-gray-500'
                                        }`}>
                                        {isSelected && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="px-5 py-4 border-t border-[#2a3544]">
                        <button
                            onClick={handleAddMembers}
                            disabled={selectedUsers.length === 0 || adding}
                            className="w-full py-3 bg-gradient-to-r from-[#8B7FFF] to-[#6366f1] text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {adding ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Add {selectedUsers.length} Member{selectedUsers.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
