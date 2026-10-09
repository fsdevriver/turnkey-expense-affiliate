import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Building2, Sparkles, Copy, Check, Apple, Smartphone } from 'lucide-react';

import api from '../services/api';

const ANDROID_PACKAGE = 'com.turnkeyexpense.dev';
const IOS_APP_ID = '6747061221';

export const JoinLanding = () => {
  const [searchParams] = useSearchParams();
  const code = (searchParams.get('ref') || '').trim().toUpperCase();
  const [copied, setCopied] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [platform, setPlatform] = useState(null);

  const playStoreUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&referrer=ref_code%3D${encodeURIComponent(code)}`;
  const appStoreUrl = `https://apps.apple.com/app/id${IOS_APP_ID}`;

  useEffect(() => {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);

    // Track click on self-hosted backend with device fingerprinting
    if (code) {
      const screenW = Math.round(window.screen.width || 0);
      const screenH = Math.round(window.screen.height || 0);
      const ratio = Number(window.devicePixelRatio || 1).toFixed(1);
      let timezone = '';
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch (e) {}

      api.post('/referral/track-click', {
        code,
        platform: isAndroid ? 'android' : isIOS ? 'ios' : 'desktop',
        screenWidth: screenW,
        screenHeight: screenH,
        pixelRatio: ratio,
        timezone,
      }).catch(() => {});
    }

    if (isAndroid) {
      setIsMobileDevice(true);
      setPlatform('android');
      // Instant Direct Store Redirect for Android
      window.location.replace(playStoreUrl);
    } else if (isIOS) {
      setIsMobileDevice(true);
      setPlatform('ios');
      // Instant Direct Store Redirect for iOS (App Store)
      window.location.replace(appStoreUrl);
    }
  }, [code, playStoreUrl, appStoreUrl]);

  const handleCopy = () => {
    if (code && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleIosClaim = () => {
    // 1. Copy code with user touch gesture
    if (code && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopied(true);
    // 2. Open App Store immediately
    setTimeout(() => {
      window.location.href = appStoreUrl;
    }, 200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-xl border-border/60 text-center overflow-hidden">
        <div className="bg-primary/10 p-6 flex flex-col items-center border-b border-primary/20">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md mb-3">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Turnkey Expense</h1>
          <p className="text-xs text-muted-foreground mt-1">Smart Rental Property & Expense Management</p>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Referral Invitation</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You were invited to Turnkey Expense. Claim your bonus after signing up and adding your first expense.
            </p>
          </div>

          {code && (
            <div className="p-4 rounded-xl bg-muted/60 border space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Referral Bonus Code
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-2xl font-bold tracking-widest text-primary">
                  {code}
                </span>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-xs gap-1">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {copied ? '✓ Code copied to your clipboard' : 'Code will be applied to your account'}
              </p>
            </div>
          )}

          {platform === 'ios' ? (
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleIosClaim}
                className="w-full gap-2 h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              >
                <Apple className="h-5 w-5" />
                <span>Claim Bonus & Open App Store</span>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Copies code to clipboard and opens the Apple App Store
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-medium text-muted-foreground">
                {isMobileDevice ? 'Tap below if store did not open automatically:' : 'Download the mobile app to get started:'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <a href={appStoreUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full gap-2 h-11 text-xs">
                    <Apple className="h-4 w-4" />
                    <span>App Store</span>
                  </Button>
                </a>
                <a href={playStoreUrl}>
                  <Button className="w-full gap-2 h-11 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Smartphone className="h-4 w-4" />
                    <span>Google Play</span>
                  </Button>
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
