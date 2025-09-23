// src/pages/Login.jsx - Admin Portal Version
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/AppIcon';
import Logo from '../components/ui/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [authMethod, setAuthMethod] = useState('password');
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
    checkSession();
  }, []);

  // Mouse move effect for glow
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await routeUserByRole(session);
    }
  };

  const routeUserByRole = async (session) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('auth_user_id', session.user.id)
      .single();

    if (profile) {
      // Check if user is a client - redirect to client portal
      if (profile.role === 'standard') {
        window.location.href = 'https://app.rule27design.com';
        return;
      }

      // Admin/contributor/client_manager - check onboarding
      if (!profile.onboarding_completed) {
        navigate('/setup-profile');
      } else {
        navigate('/');
      }
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      await routeUserByRole(data.session);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setSuccess('Check your email for the login link!');
      setEmail('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Animated background particles
  const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-accent/30 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
          }}
          animate={{
            x: [null, Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)],
            y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000)],
          }}
          transition={{
            duration: Math.random() * 20 + 10,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear",
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
      {/* Mouse Follower Glow */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(229, 62, 62, 0.15), transparent 40%)`,
        }}
      />

      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-accent/20 to-transparent blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-radial from-accent/10 to-transparent blur-3xl"></div>
            <motion.div 
              className="absolute top-1/4 left-1/4 w-72 h-72 bg-accent/20 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </div>
        
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full bg-[linear-gradient(to_right,#4f4f4f_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        </div>

        <FloatingParticles />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={isVisible ? { scale: 1, opacity: 1, rotate: 0 } : {}}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut",
            type: "spring",
            stiffness: 100,
          }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <Logo 
                variant="icon"
                colorScheme="white"
                className="transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
              />
              <motion.div 
                className="absolute -inset-4 bg-gradient-to-r from-accent to-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>
          <h1 className="text-4xl font-heading-bold text-white uppercase tracking-wider">
            Admin Portal
          </h1>
          <p className="text-gray-400 mt-2 font-sans">
            Team members only
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10"
        >
          {/* Auth Method Tabs */}
          <div className="flex space-x-2 mb-6">
            <button
              type="button"
              onClick={() => setAuthMethod('password')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 font-heading-regular uppercase tracking-wider ${
                authMethod === 'password'
                  ? 'bg-gradient-to-r from-accent to-red-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('magic')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 font-heading-regular uppercase tracking-wider ${
                authMethod === 'magic'
                  ? 'bg-gradient-to-r from-accent to-red-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Magic Link
            </button>
          </div>

          {authMethod === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
              <div>
                <Input
                  type="email"
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="team@rule27design.com"
                  className="w-full bg-white/10 border-white/20 text-white placeholder-gray-500"
                  labelClassName="text-gray-300"
                />
              </div>

              <div>
                <Input
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full bg-white/10 border-white/20 text-white placeholder-gray-500"
                  labelClassName="text-gray-300"
                />
                <div className="mt-2 text-right">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-accent hover:text-red-400 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20"
                >
                  <div className="flex items-center space-x-2">
                    <Icon name="AlertCircle" size={16} />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}

              <Button
                type="submit"
                variant="default"
                fullWidth
                loading={loading}
                disabled={loading || !email || !password}
                className="bg-gradient-to-r from-accent to-red-500 hover:from-red-500 hover:to-accent text-white font-heading-regular uppercase tracking-wider transform hover:scale-[1.02] transition-all duration-300"
              >
                Sign In
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <Input
                  type="email"
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="team@rule27design.com"
                  className="w-full bg-white/10 border-white/20 text-white placeholder-gray-500"
                  labelClassName="text-gray-300"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20"
                >
                  <div className="flex items-center space-x-2">
                    <Icon name="AlertCircle" size={16} />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-lg text-sm bg-green-500/10 text-green-400 border border-green-500/20"
                >
                  <div className="flex items-center space-x-2">
                    <Icon name="CheckCircle" size={16} />
                    <span>{success}</span>
                  </div>
                </motion.div>
              )}

              <Button
                type="button"
                variant="default"
                fullWidth
                onClick={handleMagicLink}
                loading={loading}
                disabled={loading || !email}
                className="bg-gradient-to-r from-accent to-red-500 hover:from-red-500 hover:to-accent text-white font-heading-regular uppercase tracking-wider transform hover:scale-[1.02] transition-all duration-300"
                iconName="Mail"
              >
                Send Magic Link
              </Button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm font-sans">
              Client?{' '}
              <a 
                href="https://app.rule27design.com" 
                className="text-accent hover:text-red-400 transition-colors font-medium"
              >
                Client Portal
              </a>
            </p>
          </div>
        </motion.div>

        {/* Bottom Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <div className="flex justify-center space-x-6 text-sm">
            <a 
              href="https://www.rule27design.com" 
              className="text-gray-400 hover:text-accent transition-colors flex items-center space-x-1"
            >
              <Icon name="Home" size={14} />
              <span>Main Site</span>
            </a>
            <a 
              href="https://www.rule27design.com/contact" 
              className="text-gray-400 hover:text-accent transition-colors flex items-center space-x-1"
            >
              <Icon name="MessageCircle" size={14} />
              <span>Support</span>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-to));
        }
      `}</style>
    </div>
  );
};

export default Login;