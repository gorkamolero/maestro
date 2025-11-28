import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      await login(pin);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pairing failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="7" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="17" cy="12" r="1.5" fill="currentColor" />
              <path d="M7 9.5V8M12 9.5V8M17 9.5V8" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-content-primary">Maestro</h1>
          <p className="text-content-secondary mt-1.5 text-small">
            Connect to your desktop
          </p>
        </div>

        {/* PIN Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-small font-medium text-content-secondary mb-2">
              Enter PIN from your Mac
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-surface-card border border-white/[0.06] rounded-input px-4 py-3.5
                text-center text-xl font-mono tracking-[0.3em] text-content-primary
                placeholder:text-content-tertiary
                focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-status-error/10 border border-status-error/20 rounded-button px-4 py-3">
              <p className="text-status-error text-small text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pin.length !== 6 || isLoading}
            className="w-full h-11 bg-accent hover:bg-accent-hover active:bg-accent
              text-white font-medium rounded-button
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                Pairing...
              </span>
            ) : (
              'Pair Device'
            )}
          </button>
        </form>

        {/* Help text */}
        <p className="text-content-tertiary text-small text-center mt-8 leading-relaxed">
          Open Maestro on your Mac and click<br />
          <span className="text-content-secondary">"Pair Mobile Device"</span> to get a PIN
        </p>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

