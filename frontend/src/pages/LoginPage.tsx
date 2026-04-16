import { FormEvent, useState } from 'react';

interface LoginPageProps {
  appName: string;
  onSubmit: (username: string, password: string) => Promise<void>;
  error: string | null;
}

export function LoginPage({ appName, onSubmit, error }: LoginPageProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(username, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card panel">
        <div className="login-card__hero">
          <div className="brand-link__mark brand-link__mark--large">PS</div>
          <div>
            <h1>{appName}</h1>
            <p className="muted">A self-hosted comic shelf with progress tracking, metadata editing, and a focused reader.</p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="form-control">
            <span>Username</span>
            <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="form-control">
            <span>Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <button className="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
