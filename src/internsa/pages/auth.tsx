import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from '@/internsa/lib/wouter-shim';
import { ArrowRight, GraduationCap, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import { supabase } from '@/internsa/lib/supabase';
import { updateProfile } from '@/internsa/lib/repository';

function useAuthPageMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const changes: Array<[string, string]> = [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
      ['meta[name="robots"]', 'noindex, nofollow'],
    ];
    const previous = changes.map(([selector]) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      return [selector, element?.content ?? null] as const;
    });

    document.title = title;
    changes.forEach(([selector, value]) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element) element.content = value;
    });

    return () => {
      document.title = previousTitle;
      previous.forEach(([selector, content]) => {
        const element = document.querySelector<HTMLMetaElement>(selector);
        if (element && content !== null) element.content = content;
      });
    };
  }, [title, description]);
}

function AuthFrame({
  pageId, pageTitle, description, audience, cardTitle, Icon, children,
}: {
  pageId: string;
  pageTitle: string;
  description: string;
  audience: string;
  cardTitle: string;
  Icon: LucideIcon;
  children: ReactNode;
}) {
  useAuthPageMeta(pageTitle, description);

  return (
    <main className="auth-page" data-testid={pageId}>
      <section className="auth-intro">
        <p className="eyebrow">InternSA · Your next step</p>
        <h1>{pageTitle.replace(' | InternSA', '')}</h1>
        <p className="auth-intro-copy">{description}</p>
        <Link className="auth-home-link" href="/" data-testid="link-auth-home">
          <ArrowRight size={14} aria-hidden="true" /> Browse opportunities without an account
        </Link>
      </section>

      <section className="auth-card" aria-labelledby={`${pageId}-heading`}>
        <div className="auth-card-head">
          <span className="auth-icon"><Icon size={20} aria-hidden="true" /></span>
          <div>
            <p className="small-label">{audience}</p>
            <h2 id={`${pageId}-heading`}>{cardTitle}</h2>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function AuthFeedback({ message, error = false }: { message: string; error?: boolean }) {
  if (!message) return null;
  return <p className={`auth-feedback${error ? ' error' : ''}`} role={error ? 'alert' : 'status'} data-testid="auth-notice">{message}</p>;
}

export function StudentSignupPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [, setLocation] = useLocation();
  const description = 'Create a student or job-seeker account to support your early-career search.';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError(false);
    setLoading(true);

    const form = event.currentTarget;
    const values = new FormData(form);
    const email = values.get('email') as string;
    const password = values.get('password') as string;
    const name = values.get('name') as string;

    if (password !== values.get('confirmPassword')) {
      setError(true);
      setMessage('Those passwords do not match. Please check them and try again.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        // Create initial profile in the database
        await updateProfile({
          id: data.user.id,
          name,
          email,
          province: 'Gauteng', // Default
          qualification: '',
          interests: []
        });

        setLocation('/dashboard');
      }
    } catch (err: any) {
      setError(true);
      setMessage(err.message || 'An error occurred during sign-up.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame pageId="page-student-signup" pageTitle="Create your student account | InternSA" description={description} audience="Students & job seekers" cardTitle="Join InternSA" Icon={GraduationCap}>
      <form className="auth-form" onSubmit={submit} data-testid="form-student-signup">
        <div className="auth-fields">
          <div className="form-field">
            <label htmlFor="student-signup-name">Full name</label>
            <input className="field" id="student-signup-name" name="name" type="text" autoComplete="name" placeholder="Your name" required data-testid="input-student-signup-name" disabled={loading} />
          </div>
          <div className="form-field">
            <label htmlFor="student-signup-email">Email address</label>
            <input className="field" id="student-signup-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required data-testid="input-student-signup-email" disabled={loading} />
          </div>
          <div className="form-field">
            <label htmlFor="student-signup-password">Password</label>
            <input className="field" id="student-signup-password" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required data-testid="input-student-signup-password" disabled={loading} />
          </div>
          <div className="form-field">
            <label htmlFor="student-signup-confirm">Confirm password</label>
            <input className="field" id="student-signup-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} placeholder="Enter your password again" required data-testid="input-student-signup-confirm" disabled={loading} />
          </div>
        </div>
        <button className="button primary auth-submit" type="submit" data-testid="button-student-signup" disabled={loading}>
          {loading ? 'Creating account...' : 'Create student account'}
        </button>
        <AuthFeedback message={message} error={error} />
      </form>
      <p className="auth-switch">Already have a student account? <Link href="/login" data-testid="link-signup-login">Log in</Link></p>
    </AuthFrame>
  );
}

export function StudentLoginPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [, setLocation] = useLocation();
  const description = 'Students, job seekers, and administrators use this same login page.';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError(false);
    setLoading(true);

    const form = event.currentTarget;
    const values = new FormData(form);
    const email = values.get('email') as string;
    const password = values.get('password') as string;

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      setLocation('/dashboard');
    } catch (err: any) {
      setError(true);
      setMessage(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame pageId="page-student-login" pageTitle="Log in | InternSA" description={description} audience="Students · job seekers · admins" cardTitle="Log in to InternSA" Icon={UserRound}>
      <form className="auth-form" onSubmit={submit} data-testid="form-student-login">
        <div className="auth-fields">
          <div className="form-field">
            <label htmlFor="student-login-email">Email address</label>
            <input className="field" id="student-login-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required data-testid="input-student-login-email" disabled={loading} />
          </div>
          <div className="form-field">
            <label htmlFor="student-login-password">Password</label>
            <input className="field" id="student-login-password" name="password" type="password" autoComplete="current-password" placeholder="Your password" required data-testid="input-student-login-password" disabled={loading} />
          </div>
        </div>
        <button className="button primary auth-submit" type="submit" data-testid="button-student-login" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
        <AuthFeedback message={message} error={error} />
      </form>
      <p className="auth-switch">New student or job seeker? <Link href="/signup" data-testid="link-login-signup">Create a student account</Link></p>
      <Link className="text-link auth-admin-preview" href="/dashboard" data-testid="link-student-preview">Open the unprotected students dashboard <ArrowRight size={13} aria-hidden="true" /></Link>
      <p className="auth-admin-note">Admins use this same login. Admin accounts cannot be created here.</p>
      <Link className="text-link auth-admin-preview" href="/admin" data-testid="link-admin-preview">Open the unprotected admin dashboard <ArrowRight size={13} aria-hidden="true" /></Link>
    </AuthFrame>
  );
}
