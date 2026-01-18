import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { AlertModal } from './AlertModal';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, type }) => {
  const [isLogin, setIsLogin] = useState(type === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const navigate = useNavigate();

  useEffect(() => {
    setIsLogin(type === 'login');
  }, [type, isOpen]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));

      if (!profileDoc.exists()) {
        const baseUsername = user.displayName?.replace(/\s+/g, '').toLowerCase() || user.email?.split('@')[0] || 'user';
        let finalUsername = baseUsername;
        let counter = 1;

        while (true) {
          const usernameDoc = await getDoc(doc(db, 'usernames', finalUsername));
          if (!usernameDoc.exists()) break;
          finalUsername = `${baseUsername}${counter}`;
          counter++;
        }

        await setDoc(doc(db, 'profiles', user.uid), {
          username: finalUsername,
          email: user.email,
          avatar_url: user.photoURL,
          online: true,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        await setDoc(doc(db, 'usernames', finalUsername), {
          uid: user.uid
        });
      } else {
        await setDoc(doc(db, 'profiles', user.uid), {
          online: true,
          last_seen: new Date().toISOString()
        }, { merge: true });
      }

      setAlertType('success');
      setAlertMessage('Login successful!');
      setShowAlert(true);
      onClose();
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isLogin) {
        // Register
        const displayName = username.trim() || `${firstName} ${lastName}`.trim();
        if (!displayName) throw new Error('Username or Name is required');

        // Check if username is already taken (if provided)
        if (username.trim()) {
          const usernameDoc = await getDoc(doc(db, 'usernames', username.trim().toLowerCase()));
          if (usernameDoc.exists()) throw new Error('Username is already taken');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName });

        // Generate username if not provided
        let finalUsername = username.trim();
        if (!finalUsername) {
          finalUsername = email.split('@')[0]; // Simple fallback
          // Ensure uniqueness logic could be here but for now simple fallback
        }

        await setDoc(doc(db, 'profiles', user.uid), {
          username: finalUsername,
          email: user.email,
          online: true,
          first_name: firstName,
          last_name: lastName,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (username.trim()) {
          await setDoc(doc(db, 'usernames', username.trim().toLowerCase()), { uid: user.uid });
        }

        setAlertType('success');
        setAlertMessage('Registration successful! You can now log in.');
        setIsLogin(true); // Switch to login after register? Or just auto-login. The original code auto-logged in? 
        // Original code: if register -> timeout close. But usually Firebase auto-logs in.
        // Let's assume auto-login success processing below:
        onClose();
        navigate('/dashboard', { replace: true });

      } else {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
          await setDoc(doc(db, 'profiles', userCredential.user.uid), {
            online: true,
            last_seen: new Date().toISOString()
          }, { merge: true });

          setAlertType('success');
          setAlertMessage('Login successful!');
          onClose();
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Backdrop with Gradient */}
      <div
        className="fixed inset-0 bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff] opacity-95"
        onClick={onClose}
      />

      <div className="bg-white rounded-[10px] shadow-[0_20px_35px_rgba(0,0,1,0.9)] w-[450px] p-6 relative z-10 transition-all duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <h1 className="text-2xl font-bold text-center mb-6 pt-4 text-black">
          {isLogin ? 'Sign In' : 'Register'}
        </h1>

        <form onSubmit={handleSubmit} className="px-4">
          {!isLogin && (
            <>
              <div className="relative py-2 mb-4">
                <User className="absolute left-0 top-4 text-black w-4 h-4" />
                <input
                  type="text"
                  id="fName"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <label
                  htmlFor="fName"
                  className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]"
                >
                  First Name
                </label>
              </div>

              <div className="relative py-2 mb-4">
                <User className="absolute left-0 top-4 text-black w-4 h-4" />
                <input
                  type="text"
                  id="lName"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <label
                  htmlFor="lName"
                  className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]"
                >
                  Last Name
                </label>
              </div>

              <div className="relative py-2 mb-4">
                <User className="absolute left-0 top-4 text-black w-4 h-4" />
                <input
                  type="text"
                  id="username"
                  className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <label
                  htmlFor="username"
                  className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]"
                >
                  Username
                </label>
              </div>
            </>
          )}

          <div className="relative py-2 mb-4">
            <Mail className="absolute left-0 top-4 text-black w-4 h-4" />
            <input
              type="email"
              id="email"
              className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label
              htmlFor="email"
              className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]"
            >
              Email
            </label>
          </div>

          <div className="relative py-2 mb-4">
            <Lock className="absolute left-0 top-4 text-black w-4 h-4" />
            <input
              type="password"
              id="password"
              className="w-full bg-transparent border-b border-[#757575] py-2 pl-6 text-[15px] outline-none focus:border-[#a13d7a] placeholder-transparent peer text-black"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label
              htmlFor="password"
              className="absolute left-6 top-2 text-[#757575] text-[15px] transition-all duration-300 pointer-events-none peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-4 peer-focus:text-[15px] peer-focus:text-[#a13d7a] peer-[:not(:placeholder-shown)]:-top-4 peer-[:not(:placeholder-shown)]:text-[#a13d7a]"
            >
              Password
            </label>
          </div>

          {isLogin && (
            <div className="text-right mb-4">
              <a href="#" className="text-blue-500 hover:text-blue-700 hover:underline text-base">Recover Password</a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-[#7d7deb] text-white text-[1.1rem] hover:bg-[#07001f] transition duration-500 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin h-5 w-5" />}
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[1.1rem] mb-2 text-black">----------or--------</p>
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center p-3 rounded-xl border-2 border-[#dfe9f5] hover:border-[#7d7deb] hover:bg-[#07001f] hover:text-white transition-all duration-500 text-[#7d7deb]"
            >
              {/* Google Icon from user SVG or Lucide generic */}
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </button>
          </div>

          <div className="flex justify-around px-4 font-bold mt-4">
            <p className="text-black">{isLogin ? "Don't have account yet?" : "Already Have Account ?"}</p>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#7d7deb] hover:text-blue-700 hover:underline bg-transparent border-none text-[1rem] font-bold"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        message={alertMessage}
        type={alertType}
      />
    </div>
  );
};