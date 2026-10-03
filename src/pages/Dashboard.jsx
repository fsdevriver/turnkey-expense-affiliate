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
} from 'lucide-react';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Payout Request State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [accountInfo, setAccountInfo] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('turnkey_partner_token');

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
    if (!amount || amount < (data?.min_payout_amount || 50)) {
      setError(`Minimum withdrawal amount is $${data?.min_payout_amount || 50}`);
      return;
    }
    if (!accountInfo.trim()) {
      setError('Please provide your bank or payout account details');
      return;
    }

    try {
      setPayoutLoading(true);
      setError(null);
      const res = await api.post('/partner/payout-request', {
        amount,
        payment_method: paymentMethod,
        account_info: accountInfo.trim(),
      });

      if (res.data?.success) {
        setPayoutMsg('Payout request submitted successfully!');
        setShowPayoutModal(false);
        setPayoutAmount('');
        setAccountInfo('');
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
                TURNKEY<span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm ml-1">Affiliate</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                Partner Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Wallet Balance</p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                        ${Number(data?.wallet_balance || 0).toFixed(2)}
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
                    Verified registered mobile app accounts
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
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                      <Gift className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                    Earned instantly upon referee mobile signup
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
                      <TableHead>Bonus Earned</TableHead>
                      <TableHead className="text-right">Registration Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.referrals || data.referrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No referrals recorded yet. Start sharing your link or QR code!
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.referrals.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-semibold text-foreground">{r.referee_name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.referee_phone}</TableCell>
                          <TableCell>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              +${Number(r.bonus_earned).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs">
                            {r.date ? new Date(r.date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
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
                Withdrawal Amount ($) (Min: ${data?.min_payout_amount || 50})
              </label>
              <Input
                type="number"
                step="0.01"
                max={data?.wallet_balance}
                placeholder="50.00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Payment Method</label>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="bank_transfer">Bank Transfer (ACH / Wire)</option>
                <option value="paypal">PayPal</option>
                <option value="zelle">Zelle</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Account & Routing Details
              </label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows="3"
                placeholder="e.g. Bank Name, Routing Number, Account Number, Account Name"
                value={accountInfo}
                onChange={(e) => setAccountInfo(e.target.value)}
                required
              />
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
