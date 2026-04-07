import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  RecaptchaVerifier
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Login() {
  const [step, setStep] = useState('login'); // 'login', 'register', 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('123456');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaSolved, setCaptchaSolved] = useState(false);

  // Initialize reCAPTCHA and load saved email
  useEffect(() => {
    const savedEmail = localStorage.getItem('civicshield_saved_email');
    if (savedEmail) setEmail(savedEmail);

    if (!window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'normal',
          'callback': (response) => {
            setCaptchaSolved(true);
            setError('');
          },
          'expired-callback': () => {
            setCaptchaSolved(false);
            setError('reCAPTCHA expired. Please verify again.');
          }
        });
        window.recaptchaVerifier.render().catch(console.error);
      } catch (err) {
        console.error("reCAPTCHA Error:", err);
      }
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!captchaSolved) {
      setError('Anti-Bot Protocol: Please complete the reCAPTCHA validation.');
      return;
    }

    setLoading(true);

    try {
      if (step === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('civicshield_saved_email', email);
      } else if (step === 'register') {
        if (!email.endsWith('@gmail.com')) {
          throw new Error('Restricted to @gmail.com addresses only.');
        }
        
        // Generate a random 6-digit OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(newOtp);
        
        // Simulating the Email dispatch for the Hackathon Demo
        console.log("%c=========================================", "color: #00e5ff");
        console.log(`%c🚨 CIVICSHIELD SECURITY PROTOCOL`, "color: #ff1744; font-weight: bold");
        console.log(`%c📧 GMAIL OTP SENT TO: ${email}`, "color: #00e5ff");
        console.log(`%c🔑 OTP CODE: ${newOtp}`, "color: #00ff9d; font-size: 1.2rem; font-weight: bold");
        console.log("%c=========================================", "color: #00e5ff");
        
        setMessage(`OTP Dispatched. (DEMO MODE: Your OTP is ${newOtp})`);
        setStep('otp');
      }
    } catch (err) {
      const errMsg = err.message || '';
      if (errMsg.includes('email-already-in-use')) {
        setError('ACCESS DENIED: Operative email already registered in the central database.');
      } else {
        setError(errMsg.replace('Firebase:', '').trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // For this CyberSecurity demo, we validate against the dynamically generated OTP.
      if (otp === generatedOtp) { 
        await createUserWithEmailAndPassword(auth, email, password);
        localStorage.setItem('civicshield_saved_email', email);
      } else {
        throw new Error('Invalid OTP code. Access Denied.');
      }
    } catch (err) {
      const errMsg = err.message || '';
      if (errMsg.includes('email-already-in-use')) {
        setError('ACCESS DENIED: Operative email already registered in the central database.');
      } else {
        setError(errMsg.replace('Firebase:', '').trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <motion.div 
        className="glass login-container"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="login-header">
          <div className="shield-icon-lg">🛡️</div>
          <h2 className="gradient-text brand-title" style={{ fontSize: '1.8rem', marginTop: '1rem' }}>
            CIVICSHIELD
          </h2>
          <p className="brand-subtitle">SECURE AUTHENTICATION PROTOCOL</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'otp' ? (
             <motion.form 
             key="otp"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             onSubmit={handleVerifyOTP}
             className="login-form"
           >
             <AnimatePresence>
               <motion.div 
                 initial={{ opacity: 0, y: -15, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: -15, scale: 0.95 }}
                 transition={{ type: "spring", stiffness: 300, damping: 20 }}
                 className="auth-alert success" 
                 style={{ marginBottom: '1rem' }}
               >
                 <span>📩</span> {message || "Check your console! (F12) A secure OTP was sent."}
               </motion.div>
             </AnimatePresence>
             
             <AnimatePresence>
               {error && (
                 <motion.div 
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 10 }}
                   transition={{ type: "spring", stiffness: 400, damping: 10 }}
                   className="auth-alert error"
                   style={{ marginBottom: '1rem' }}
                 >
                   <span>🚨</span> {error}
                 </motion.div>
               )}
             </AnimatePresence>
 
             <div className="field-group">
               <label>ENTER 6-DIGIT OTP</label>
               <input 
                 type="text" 
                 placeholder="------" 
                 value={otp}
                 onChange={(e) => setOtp(e.target.value)}
                 maxLength="6"
                 style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }}
                 required
               />
             </div>
             
             <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
               {loading ? '⏳ VERIFYING...' : 'CONFIRM IDENTITY'}
             </button>
           </motion.form>
          ) : (
            <motion.form 
              key="auth-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleAuth}
              className="login-form"
            >
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="auth-alert error"
                  >
                    <span>🚨</span> {error}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence>
                {message && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="auth-alert success"
                  >
                    <span>✅</span> {message}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="field-group">
                <label>GMAIL ADDRESS</label>
                <input 
                  type="email" 
                  placeholder="agent@gmail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label>SECURE PASSWORD (SHA-256 Encrypted)</label>
                <input 
                  type="password" 
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="8"
                />
              </div>

              <div className="recaptcha-wrapper">
                <div id="recaptcha-container"></div>
              </div>

              {step === 'register' && (
                <div className="password-requirements">
                  <p>Password &gt; 8 characters • reCAPTCHA Validation Required.</p>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary auth-btn" 
                disabled={loading}
                style={{ marginTop: '0.8rem' }}
              >
                {loading ? '⏳ AUTHENTICATING...' : (step === 'login' ? '🔓 INITIATE SECURE LOGIN' : '📝 DISPATCH OTP')}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {step !== 'otp' && (
          <>
            <div className="auth-divider">
              <span>OR CONTINUE WITH</span>
            </div>

            <button 
              className="btn btn-google" 
              onClick={signInWithGoogle}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              Google SSO
            </button>

            <div className="auth-toggle">
              {step === 'login' ? (
                <p>New operative? <span onClick={() => { setStep('register'); setError(''); setMessage(''); }}>Request Clearance Registration</span></p>
              ) : (
                <p>Already registered? <span onClick={() => { setStep('login'); setError(''); setMessage(''); }}>Return to Login</span></p>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
