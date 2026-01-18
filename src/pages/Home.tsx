import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../lib/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Loader2, Bot } from 'lucide-react';
import { validateUsername, validateEmail } from '../lib/security';

type FormType = 'login' | 'register' | 'reset';

export const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [formType, setFormType] = useState<FormType>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Reset field
  const [resetEmail, setResetEmail] = useState('');

  // Redirect authenticated users back to the dashboard
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Render-level guard to prevent showing auth page when already signed in
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    const usernameDoc = await getDoc(doc(db, 'usernames', username));
    return !usernameDoc.exists();
  };

  const createUserProfile = async (uid: string, email: string, displayName: string, photoURL?: string) => {
    const baseUsername = displayName.replace(/\s+/g, '').toLowerCase() || email.split('@')[0] || 'user';
    let finalUsername = baseUsername;
    let counter = 1;

    while (!(await checkUsernameAvailability(finalUsername))) {
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }

    await setDoc(doc(db, 'profiles', uid), {
      username: finalUsername,
      email: email,
      avatar_url: photoURL || '',
      online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await setDoc(doc(db, 'usernames', finalUsername), {
      uid: uid
    });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));

      if (!profileDoc.exists()) {
        await createUserProfile(user.uid, user.email!, user.displayName || 'User', user.photoURL || undefined);
      } else {
        await setDoc(doc(db, 'profiles', user.uid), {
          online: true,
          last_seen: new Date().toISOString()
        }, { merge: true });
      }

      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'profiles', result.user.uid), {
        online: true,
        last_seen: new Date().toISOString()
      }, { merge: true });

      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match!');
      setLoading(false);
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Validate username format
    const usernameValidation = validateUsername(regUsername);
    if (!usernameValidation.valid) {
      setError(usernameValidation.error || 'Invalid username');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailValidation = validateEmail(regEmail);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email');
      setLoading(false);
      return;
    }

    try {
      // Check if username is available
      const isAvailable = await checkUsernameAvailability(regUsername.toLowerCase());
      if (!isAvailable) {
        setError('Username is already taken');
        setLoading(false);
        return;
      }

      const result = await createUserWithEmailAndPassword(auth, regEmail, regPassword);

      // Determine display name
      const displayName = `${regFirstName} ${regLastName}`.trim() || regUsername;

      await updateProfile(result.user, { displayName: displayName });

      // Create profile with the chosen username
      await setDoc(doc(db, 'profiles', result.user.uid), {
        username: regUsername.toLowerCase() || regEmail.split('@')[0],
        email: regEmail,
        first_name: regFirstName,
        last_name: regLastName,
        avatar_url: '',
        online: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Reserve username if present
      if (regUsername) {
        await setDoc(doc(db, 'usernames', regUsername.toLowerCase()), {
          uid: result.user.uid
        });
      }

      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setError('');
      alert('Password reset link sent! Check your email.');
      setFormType('login');
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  // ... inside Home component, need to add new state vars first ...
  // Wait, I need to do this carefully. I can't just replace the return. I need to add state variables too.
  // I will use multi_replace.
  return (
    <>
      <Helmet>
        <title>{formType === 'login' ? 'Sign In' : 'Register'}</title>
        <meta name="description" content="Sign in or Register" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff] p-4 font-['Poppins']">
        <div className="bg-white rounded-[10px] shadow-[0_20px_35px_rgba(0,0,1,0.9)] w-[450px] p-6 relative z-10 transition-all duration-300">

          <div className="flex flex-col items-center mb-6 pt-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-2xl flex items-center justify-center shadow-xl shadow-[#10b981]/20 transform hover:rotate-6 transition-transform">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center mt-4 text-black">
              {formType === 'login' ? 'Sign In' : formType === 'register' ? 'Register' : 'Reset Password'}
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-2.5 bg-red-100 border border-red-300 rounded-lg text-red-600 text-xs text-center">
              {error}
            </div>
          )}

          {formType === 'login' && (
            <form onSubmit={handleLogin} className="px-4">
              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4" >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </i>
                <input
                  type="email"
                  id="email"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label htmlFor="email" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">Email</label>
              </div>
              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </i>
                <input
                  type="password"
                  id="password"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <label htmlFor="password" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">Password</label>
              </div>

              <div className="text-right mb-4">
                <button type="button" onClick={() => setFormType('reset')} className="text-blue-500 hover:text-blue-700 hover:underline text-base">Recover Password</button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded bg-[#7d7deb] text-white text-[1.1rem] hover:bg-[#07001f] transition duration-500 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign In'}
              </button>
            </form>
          )}

          {formType === 'register' && (
            <form onSubmit={handleRegister} className="px-4">
              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </i>
                <input
                  type="text"
                  id="fName"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="First Name"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                />
                <label htmlFor="fName" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">First Name</label>
              </div>

              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </i>
                <input
                  type="text"
                  id="lName"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Last Name"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                />
                <label htmlFor="lName" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">Last Name</label>
              </div>

              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </i>
                <input
                  type="text"
                  id="username"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                />
                <label htmlFor="username" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">Username</label>
              </div>

              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </i>
                <input
                  type="email"
                  id="rEmail"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
                <label htmlFor="rEmail" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">Email</label>
              </div>

              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </i>
                <input
                  type="password"
                  id="rPassword"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  minLength={8}
                />
                <label htmlFor="rPassword" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">Password</label>
              </div>

              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </i>
                <input
                  type="password"
                  id="confirmPassword"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Confirm Password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  minLength={8}
                />
                <label htmlFor="confirmPassword" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">Confirm Password</label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded bg-[#7d7deb] text-white text-[1.1rem] hover:bg-[#07001f] transition duration-500 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign Up'}
              </button>
            </form>
          )}

          {formType === 'reset' && (
            <form onSubmit={handleResetPassword} className="px-4">
              <div className="mb-6 text-center text-gray-600 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </div>
              <div className="relative py-2 mb-4">
                <i className="absolute left-0 top-4 text-black w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </i>
                <input
                  type="email"
                  id="resetEmail"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <label htmlFor="resetEmail" className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]">Email</label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded bg-[#7d7deb] text-white text-[1.1rem] hover:bg-[#07001f] transition duration-500 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send Reset Link'}
              </button>
              <div className="text-center mt-4">
                <button onClick={() => setFormType('login')} className="text-[#7d7deb] hover:text-blue-700 hover:underline">Back to Sign In</button>
              </div>
            </form>
          )}

          {formType !== 'reset' && (
            <div className="mt-4 text-center">
              <p className="text-[1.1rem] mb-2 text-black">----------or--------</p>
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center justify-center p-3 rounded-xl border-2 border-[#dfe9f5] hover:border-[#7d7deb] hover:bg-[#07001f] hover:text-white transition-all duration-500 text-[#7d7deb]"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </button>
              </div>

              <div className="flex justify-around px-4 font-bold mt-4">
                <p className="text-black">{formType === 'login' ? "Don't have account yet?" : "Already Have Account ?"}</p>
                <button
                  onClick={() => setFormType(formType === 'login' ? 'register' : 'login')}
                  className="text-[#7d7deb] hover:text-blue-700 hover:underline bg-transparent border-none text-[1rem] font-bold"
                >
                  {formType === 'login' ? "Sign Up" : "Sign In"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};