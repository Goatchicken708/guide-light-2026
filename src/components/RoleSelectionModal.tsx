import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Briefcase, GraduationCap, School, Loader2, Check } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface RoleSelectionModalProps {
    isOpen: boolean;
    onRoleSelected: () => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen, onRoleSelected }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);

    const roles = [
        {
            id: 'student',
            label: 'Student',
            icon: GraduationCap,
            description: 'I am currently studying'
        },
        {
            id: 'teacher',
            label: 'Teacher',
            icon: School,
            description: 'I am an educator'
        },
        {
            id: 'professional',
            label: 'Working Professional',
            icon: Briefcase,
            description: 'I am working in the industry'
        }
    ];

    const handleSelectRole = async () => {
        if (!user || !selectedRole) return;

        setLoading(true);
        try {
            const userRef = doc(db, 'profiles', user.uid);
            await updateDoc(userRef, {
                role: selectedRole
            });
            onRoleSelected();
        } catch (error) {
            console.error('Error updating role:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#1a2332] border border-[#2a3544] rounded-2xl w-full max-w-lg shadow-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Welcome to CareerConnect</h2>
                <p className="text-gray-400 text-center mb-8">Please select your current role to get started</p>

                <div className="space-y-4 mb-8">
                    {roles.map((role) => {
                        const Icon = role.icon;
                        const isSelected = selectedRole === role.id;

                        return (
                            <button
                                key={role.id}
                                onClick={() => setSelectedRole(role.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 group text-left ${isSelected
                                        ? 'border-[#8B7FFF] bg-[#8B7FFF]/10'
                                        : 'border-[#2a3544] bg-[#0e1621] hover:border-[#8B7FFF]/50'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-[#8B7FFF] text-white' : 'bg-[#1a2332] text-gray-400 group-hover:text-[#8B7FFF]'
                                    }`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className={`font-semibold text-lg ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                        {role.label}
                                    </h3>
                                    <p className="text-sm text-gray-400">{role.description}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                        ? 'border-[#8B7FFF] bg-[#8B7FFF]'
                                        : 'border-gray-600'
                                    }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={handleSelectRole}
                    disabled={!selectedRole || loading}
                    className="w-full py-4 bg-gradient-to-r from-[#8B7FFF] to-[#6366f1] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Continue'
                    )}
                </button>
            </div>
        </div>
    );
};
