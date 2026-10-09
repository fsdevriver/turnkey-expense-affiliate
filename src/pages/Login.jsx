import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Building2, AlertCircle, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Login = () => {
  // Steps:
  // 1: Phone input -> Click next arrow
  // 'password': Old user -> Enter password & submit login
  // 'otp': New user -> Enter 6-digit OTP (auto-submits on 6 digits)
  // 'setPassword': New user -> Enter password & confirm password -> submit to activate & login
  const [step, setStep] = useState(1);

  const [phone, setPhone] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Password for existing user
  const [password, setPassword] = useState('');

  // OTP for new user
  const [otp, setOtp] = useState('');

  // New password & confirm for new user
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);
  const navigate = useNavigate();

  // Reset to phone step
  const handleReset = () => {
    setStep(1);
    setPassword('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setInfoMsg(null);
  };

  // Step 1: Submit Phone Number / Check User
  const handleCheckPhone = async (e) => {
    if (e) e.preventDefault();
    const rawDigits = phone.replace(/\D/g, '');
    if (!rawDigits) {
      setError('Please enter your registered phone number');
      return;
    }
    const fullPhone = '+1' + rawDigits;

    try {
      setLoading(true);
      setError(null);
      setInfoMsg(null);

      const res = await api.post('/partner/check-identifier', {
        identifier: fullPhone,
      });

      if (res.data?.success) {
        setPartnerName(res.data.name || '');

        if (res.data.has_password) {
          // Existing user with password set
          setStep('password');
        } else {
          // New user -> OTP was dispatched
          setMaskedEmail(res.data.email_masked || '');
          setInfoMsg(res.data.message || 'Verification code sent to your registered phone.');
          setStep('otp');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Account not found. Please contact support or administrator.');
    } finally {
      setLoading(false);
    }
  };

  // Old user: Login with existing password
  const handleLoginExisting = async (e) => {
    if (e) e.preventDefault();
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/partner/login', {
        identifier: '+1' + phone.replace(/\D/g, ''),
        password,
      });

      if (res.data?.success && res.data?.token) {
        localStorage.setItem('turnkey_partner_token', res.data.token);
        localStorage.setItem('turnkey_partner_profile', JSON.stringify(res.data.partner));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit OTP verification when 6 digits are entered
  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    setError(null);

    if (val.length === 6) {
      submitVerifyOtp(val);
    }
  };

  const submitVerifyOtp = async (code) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/partner/verify-setup-otp-only', {
        identifier: phone.startsWith('+1') ? phone : '+1' + phone.replace(/\D/g, ''),
        otp: code,
      });

      if (res.data?.success) {
        setInfoMsg('Code verified! Please set your new password.');
        setStep('setPassword');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/partner/request-setup-otp', {
        identifier: phone.startsWith('+1') ? phone : '+1' + phone.replace(/\D/g, ''),
      });
      if (res.data?.success) {
        setInfoMsg(res.data.message || 'New verification code sent!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // New user: Set password and auto-login
  const handleSetPasswordAndLogin = async (e) => {
    if (e) e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/partner/verify-setup-otp', {
        identifier: phone.startsWith('+1') ? phone : '+1' + phone.replace(/\D/g, ''),
        otp: otp.trim(),
        password: newPassword,
      });

      if (res.data?.success && res.data?.token) {
        localStorage.setItem('turnkey_partner_token', res.data.token);
        localStorage.setItem('turnkey_partner_profile', JSON.stringify(res.data.partner));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">TURNKEY Affiliate Portal</CardTitle>
          <CardDescription>
            {step === 1 && 'Enter your registered phone number to sign in'}
            {step === 'password' && `Welcome back, ${partnerName || 'Partner'}! Enter your password.`}
            {step === 'otp' && 'Enter the 6-digit verification code sent to your phone (or email)'}
            {step === 'setPassword' && 'Create your password to complete activation'}
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
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: Phone Number Input with Fixed +1 and US Flag */}
          {step === 1 && (
            <form onSubmit={handleCheckPhone} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="flex gap-2">
                  <div className="flex flex-1 items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden transition-all">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-r border-input select-none shrink-0">
                      <span className="text-base leading-none" role="img" aria-label="United States">🇺🇸</span>
                      <span className="text-sm font-semibold text-foreground tracking-tight">+1</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        const clean = val.replace(/^\+?1\s*/, '');
                        setPhone(clean);
                      }}
                      required
                      autoFocus
                      className="border-0 shadow-none focus-visible:ring-0 px-3 h-10 w-full rounded-none"
                    />
                  </div>
                  <Button type="submit" disabled={loading || !phone.trim()} className="px-4 h-10">
                    {loading ? (
                      <span className="animate-spin text-sm">⋯</span>
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 'password': Existing User Password Screen */}
          {step === 'password' && (
            <form onSubmit={handleLoginExisting} className="space-y-4">
              <div className="flex items-center justify-between text-sm bg-muted/50 p-2.5 rounded-lg border">
                <span className="font-medium text-foreground">{phone.startsWith("+1") ? phone : "+1 " + phone}</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Change
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          )}

          {/* STEP 'otp': New User OTP Screen (Auto-submits on 6 digits) */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm bg-muted/50 p-2.5 rounded-lg border">
                <span className="font-medium text-foreground">{phone.startsWith("+1") ? phone : "+1 " + phone}</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground text-center block">
                  6-Digit Verification Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={handleOtpChange}
                  autoFocus
                  disabled={loading}
                  className="text-center text-2xl tracking-[0.4em] font-mono h-12"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Submits automatically upon entering 6 digits
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button variant="link" size="sm" onClick={handleResendOtp} disabled={loading} className="text-xs">
                  Resend Code
                </Button>
              </div>
            </div>
          )}

          {/* STEP 'setPassword': New User Password & Confirm Password */}
          {step === 'setPassword' && (
            <form onSubmit={handleSetPasswordAndLogin} className="space-y-4">
              <div className="flex items-center justify-between text-sm bg-muted/50 p-2.5 rounded-lg border">
                <span className="font-medium text-foreground">{phone.startsWith("+1") ? phone : "+1 " + phone}</span>
                <span className="text-xs text-emerald-600 flex items-center font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Create Password</label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Activating & Signing In...' : 'Save Password & Sign In'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0 pb-6">
          <div className="text-xs text-center text-muted-foreground">
            TURNKEY Expense Affiliate & Referral Network
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
