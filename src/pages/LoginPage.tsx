import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Chrome, Shield, Database, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [ssoLoading, setSsoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSsoLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setSsoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-[13px] font-mono animate-pulse">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left panel: branding ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border bg-sidebar relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-sm bg-primary flex items-center justify-center shadow-glow-cyan">
              <Zap size={18} className="text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground tracking-tight">Synthetix DB</p>
              <p className="text-[10px] text-muted-foreground font-mono">AI-Powered Database Assistant</p>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="space-y-6 mt-8">
            {[
              {
                icon: Database,
                title: "Connect Any Database",
                desc: "PostgreSQL & MongoDB support with automatic schema discovery.",
              },
              {
                icon: Sparkles,
                title: "AI Query Generation",
                desc: "Describe what you need — get optimized, safe SQL/NoSQL queries.",
              },
              {
                icon: Shield,
                title: "Read-Only Enforcement",
                desc: "Write operations are blocked at every layer. Your data stays safe.",
              },
              {
                icon: Lock,
                title: "Encrypted Credentials",
                desc: "Database passwords are encrypted server-side and never returned to clients.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-primary-dim border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-foreground">{title}</p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[11px] text-muted-foreground font-mono">
            v2.1.0 · Production-Ready · SOC2 Compliant
          </p>
        </div>
      </div>

      {/* ── Right panel: sign-in form ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px] space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center">
              <Zap size={15} className="text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-semibold text-foreground">Synthetix DB</span>
          </div>

          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Sign in</h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              Authenticate via SSO to access your database workspace.
            </p>
          </div>

          {/* SSO badges */}
          <div className="flex flex-wrap gap-2">
            {["OAuth 2.0", "OpenID Connect", "Google SSO"].map((label) => (
              <span
                key={label}
                className="px-2 py-0.5 rounded-sm bg-primary-dim border border-primary/20 text-[10.5px] font-mono text-primary"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-[12px] font-mono">
              {error}
            </div>
          )}

          {/* Google SSO button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={ssoLoading}
            className={cn(
              "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-sm",
              "border border-border bg-surface text-foreground text-[13px] font-medium",
              "hover:bg-surface-raised hover:border-surface-border transition-snap",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {ssoLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {ssoLoading ? "Redirecting to SSO…" : "Continue with Google"}
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground font-mono">ENTERPRISE SSO</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="panel p-4 space-y-2">
            <p className="text-[11.5px] font-semibold text-foreground">Corporate Identity Provider</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Okta, Microsoft Entra, and other OIDC/SAML providers can be configured in{" "}
              <span className="text-primary font-mono">Settings → Security</span>.
              Contact your workspace administrator.
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            By signing in you agree to the Terms of Service. All sessions are audited.
          </p>
        </div>
      </div>
    </div>
  );
}
