import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export const Setup = () => {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP & Set Password
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);
  const navigate = useNavigate();

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your registered phone / email');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/partner/request-setup-otp', {
        identifier: identifier.trim(),
      });

      if (res.data?.success) {
        setInfoMsg(res.data.message || 'OTP sent successfully!');
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please verify your details or contact support.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Set Password
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/partner/verify-setup-otp', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        password,
      });

      if (res.data?.success && res.data?.token) {
        localStorage.setItem('turnkey_partner_token', res.data.token);
        localStorage.setItem('turnkey_partner_profile', JSON.stringify(res.data.partner));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify OTP or set password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Partner Account Activation</CardTitle>
          <CardDescription>
            {step === 1
              ? 'Verify your registered contact details to receive a 6-digit email OTP'
              : 'Enter the 6-digit verification code and choose your account password'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Registered Phone or Email
                </label>
                <Input
                  type="text"
                  placeholder="e.g. +1 (555) 000-1234 or partner@turnkey.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the phone / email.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending OTP...' : 'Send Verification OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  6-Digit OTP Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center font-mono text-xl tracking-widest"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Activating Account...' : 'Set Password & Enter Dashboard'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs text-muted-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Request OTP again
                </Button>
              </div>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center border-t py-4">
          <p className="text-sm text-muted-foreground">
            Already activated?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign In here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
