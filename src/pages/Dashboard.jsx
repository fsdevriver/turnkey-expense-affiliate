import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Wallet,
  Users,
  Gift,
  Copy,
  Check,
  QrCode,
  Download,
  LogOut,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Building2,
  Calendar,
  Hourglass,
  Clock,
  ExternalLink,
  ArrowUpRight,
  Bell,
} from 'lucide-react';
import {
  subscribeToRealtimeEvents,
  requestNotificationPermission,
} from '../services/realtime';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Payout Request State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutEmail, setPayoutEmail] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState(null);

  // Notification State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifDropdownRef = React.useRef(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('turnkey_partner_token');

  // Play subtle chime on new notification
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications/partner?limit=15');
      if (res.data?.success && res.data?.data) {
        setNotifications(res.data.data.items || []);
        setUnreadCount(res.data.data.unreadCount || res.data.data.unread_count || 0);
      }
    } catch (err) {
      console.warn('Failed to load partner notifications:', err);
    }
  };

  const markItemAsRead = async (id) => {
    try {
      await api.patch(`/notifications/partner/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/partner/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  };

  const fetchDashboard = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/partner/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
        if (res.data.data?.email && !payoutEmail) {
          setPayoutEmail(res.data.data.email);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('turnkey_partner_token');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchNotifications();
    requestNotificationPermission();

    // Close notifications dropdown on outside click
    const handleOutsideClick = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    // Subscribe to SSE realtime events
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      // If notification is for partner
      if (event.event === 'notification.new') {
        const notif = event.data;
        if (notif && (notif.role === 'partner' || notif.role === 'all')) {
          setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
          setUnreadCount((c) => c + 1);
          playChime();
        }
      }

      // If payout was approved/rejected, bonus was credited, or a new referral signed up, refresh dashboard metrics in realtime
      if (
        event.event === 'payout.updated' ||
        event.event === 'referral.completed' ||
        event.event === 'referral.created' ||
        event.event === 'payout.created'
      ) {
        fetchDashboard();
      }
    });

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      unsubscribe();
    };
  }, []);

  const baseUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://affiliate.turnkeyexpense.com';

  const shareUrl = data?.referral_code
    ? `${baseUrl}/join?ref=${data.referral_code}`
    : (data?.share_url ? data.share_url.replace(/https?:\/\/[^/]+/g, baseUrl) : '');

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = () => {
    if (data?.referral_code) {
      navigator.clipboard.writeText(data.referral_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('turnkey_partner_token');
    localStorage.removeItem('turnkey_partner_profile');
    navigate('/login');
  };

  const handleSubmitPayout = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }
    if (amount > (data?.wallet_balance || 0)) {
      setError('Withdrawal amount cannot exceed your wallet balance');
      return;
    }
    const email = payoutEmail.trim();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid payout delivery email address to receive your reward');
      return;
    }

    try {
      setPayoutLoading(true);
      setError(null);
      const res = await api.post('/partner/payout-request', {
        amount,
        payment_method: 'Tremendous Digital Reward',
        account_info: email,
      });

      if (res.data?.success) {
        setPayoutMsg(`Payout request for $${amount.toFixed(2)} submitted successfully! It will be delivered to ${email}.`);
        setShowPayoutModal(false);
        setPayoutAmount('');
        fetchDashboard();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit payout request');
    } finally {
      setPayoutLoading(false);
    }
  };

  const qrCodeUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 h-16 flex items-center shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
              TK
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-50">
                TurnkeyExpense<span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm ml-1">Affiliate</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                Partner Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notification Bell */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50 cursor-pointer transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 text-left transition-colors flex items-start gap-3 rounded-lg ${
                            notif.is_read || notif.isRead
                              ? 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              : 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 font-medium'
                          }`}
                        >
                          <div
                            className="mt-1 h-2 w-2 rounded-full shrink-0 bg-emerald-600"
                            style={{ visibility: notif.is_read || notif.isRead ? 'hidden' : 'visible' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 break-words">
                              {notif.body}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(notif.created_at || notif.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {!notif.is_read && !notif.isRead && (
                            <button
                              type="button"
                              onClick={() => markItemAsRead(notif.id)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer shrink-0"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center text-sm border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
                {data?.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {data?.name || 'Partner'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {data?.phone || ''}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs h-8 px-2.5 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-slate-800 dark:hover:bg-red-950/50 dark:hover:text-red-400 dark:hover:border-red-900 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {payoutMsg && (
          <div className="p-4 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium">{payoutMsg}</span>
            </div>
            <button type="button" onClick={() => setPayoutMsg(null)} className="font-bold text-lg">×</button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="font-bold text-lg">×</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Loading dashboard...
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Earnings</p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                        ${Number(data?.current_earnings ?? data?.wallet_balance ?? 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total Earned: <span className="font-semibold text-foreground">${Number(data?.total_earnings ?? data?.wallet_balance ?? 0).toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                      <Wallet className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => setShowPayoutModal(true)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" /> Request Payout
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Reserved / Next Month Bonus Card */}
              <Card className="border-purple-200/70 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-background dark:to-background">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">Reserved for Next Month</p>
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-400 mt-2">
                        +${Number(data?.pending_monthly_bonus || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      <Calendar className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-purple-100 dark:border-purple-900/30 flex items-center justify-between">
                    <span>Unlocks automatically 1st of month</span>
                    {Number(data?.waiting_expense_bonus || 0) > 0 && (
                      <span className="text-amber-600 font-medium">
                        +${Number(data?.waiting_expense_bonus).toFixed(2)} awaiting exp.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Referred Users</p>
                      <p className="text-3xl font-bold text-foreground mt-2">{data?.total_referrals || 0}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                    {data?.total_completed || 0} completed · {data?.total_pending || 0} pending
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bonus Rates</p>
                      <p className="text-2xl font-bold text-foreground mt-2">
                        ${data?.bonus_per_referral} <span className="text-sm font-normal text-muted-foreground">/ referee ${data?.user_bonus_received}</span>
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                      <Gift className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                    Credited upon referee's first recorded expense
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Referral Tools Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Alphanumeric Referral Code & Smart Link</CardTitle>
                  <CardDescription>
                    Share this code or link with clients. When scanned or clicked, deferred deep linking automatically preserves your referral attribution through Google Play or Apple App Store.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Your Unique Referral Code
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="px-5 py-2.5 rounded-lg bg-muted border font-mono font-bold text-2xl tracking-widest text-foreground">
                        {data?.referral_code}
                      </div>
                      <Button variant="outline" onClick={handleCopyCode} className="gap-2">
                        {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        {copiedCode ? 'Copied!' : 'Copy Code'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Smart Landing Redirect Link
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="font-mono text-xs bg-muted/40"
                      />
                      <Button onClick={handleCopyLink} className="shrink-0 gap-1.5">
                        {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedLink ? 'Copied!' : 'Copy Link'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* QR Code Card */}
              <Card className="flex flex-col items-center justify-center text-center p-6">
                <div className="flex items-center gap-2 mb-3 font-semibold text-foreground">
                  <QrCode className="h-5 w-5 text-primary" />
                  <span>Smart QR Code</span>
                </div>
                {qrCodeUrl && (
                  <div className="p-3 bg-white rounded-xl shadow-sm border mb-4">
                    <img
                      src={qrCodeUrl}
                      alt="Smart Referral QR"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
                  Point phone camera to install app with your code pre-filled.
                </p>
                <a
                  href={qrCodeUrl}
                  download={`Turnkey-Affiliate-${data?.referral_code}-QR.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-4 w-4" /> Download QR
                  </Button>
                </a>
              </Card>
            </div>

            {/* Referrals Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Referrals</CardTitle>
                <CardDescription>Live log of registered mobile users attributed to your code</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referee Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.referrals || data.referrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No referrals recorded yet. Start sharing your link or QR code!
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.referrals.map((r) => {
                        const isCompleted = r.status === 'completed';
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-semibold text-foreground">{r.referee_name}</TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">{r.referee_phone}</TableCell>
                            <TableCell>
                              <span className={`font-bold ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                +${Number(r.bonus_earned).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {isCompleted ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px]">
                                  Completed
                                </Badge>
                              ) : r.status === 'pending_monthly_cap' ? (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 text-[11px]">
                                  Next Month Budget
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[11px]">
                                  Awaiting 1st Expense
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs">
                              {r.date ? new Date(r.date).toLocaleDateString() : 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payout & Withdrawal History Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Withdrawal & Payout History</CardTitle>
                  <CardDescription>Track all submitted payout requests, processing status, and reward redemptions</CardDescription>
                </div>
                {data?.payouts && data.payouts.length > 0 && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {data.payouts.length} {data.payouts.length === 1 ? 'request' : 'requests'}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Account Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note / Reward</TableHead>
                      <TableHead className="text-right">Requested At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.payouts || data.payouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No withdrawal requests found. When you request a payout, status and redemptions will appear here.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.payouts.map((p) => {
                        const status = (p.status || 'pending').toLowerCase();
                        const isPaid = status === 'paid' || status === 'approved';
                        const isRejected = status === 'rejected';

                        const methodDisplay =
                          p.payment_method === 'tremendous'
                            ? 'Tremendous Reward'
                            : p.payment_method === 'bank_transfer'
                            ? 'Bank Transfer'
                            : p.payment_method === 'paypal'
                            ? 'PayPal'
                            : p.payment_method === 'zelle'
                            ? 'Zelle'
                            : p.payment_method || 'N/A';

                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <span className="font-bold text-foreground text-base">
                                ${Number(p.amount).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-xs text-muted-foreground">
                              {methodDisplay}
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground" title={p.account_info}>
                              {p.account_info || '—'}
                            </TableCell>
                            <TableCell>
                              {isPaid ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px]">
                                  Paid
                                </Badge>
                              ) : isRejected ? (
                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-[11px]">
                                  Rejected
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[11px]">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="space-y-1">
                                {p.reward_url && (
                                  <a
                                    href={p.reward_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                                  >
                                    Claim Reward <ArrowUpRight className="h-3 w-3" />
                                  </a>
                                )}
                                {p.admin_note && (
                                  <p className="text-[11px] text-muted-foreground italic">
                                    {p.admin_note}
                                  </p>
                                )}
                                {!p.reward_url && !p.admin_note && (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                              {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Payout Dialog */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Withdrawal Payout</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitPayout} className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Available Balance</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                ${Number(data?.wallet_balance || 0).toFixed(2)}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Withdrawal Amount ($)
              </label>
              <Input
                type="number"
                step="0.01"
                max={data?.wallet_balance}
                placeholder="0.00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Payout Delivery Email
              </label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={payoutEmail}
                onChange={(e) => setPayoutEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground pt-1">
                Your payout will be sent via <strong>Tremendous Digital Reward</strong> (Virtual Visa, Prepaid Card, or Gift Card) directly to this email.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowPayoutModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={payoutLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {payoutLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
