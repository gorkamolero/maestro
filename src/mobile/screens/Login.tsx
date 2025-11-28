import React, { useState } from 'react';
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Maestro</h1>
        <p className="text-white/50 text-center mb-8">
          Enter the PIN shown on your Mac
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full bg-white/10 rounded-xl px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] placeholder:text-white/20 outline-none focus:ring-2 focus:ring-white/20"
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length !== 6 || isLoading}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {isLoading ? 'Pairing...' : 'Pair Device'}
          </button>
        </form>

        <p className="text-white/30 text-xs text-center mt-8">
          Open Maestro on your Mac and click "Pair Device" to get a PIN
        </p>
      </div>
    </div>
  );
}
