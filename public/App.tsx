import { createSignal, createEffect, For, onMount } from 'solid-js';
import { Account } from './types';
import { db } from './db';

function App() {
  const [accounts, setAccounts] = createSignal<Account[]>([]);
  const [newName, setNewName] = createSignal('');
  const [newSecret, setNewSecret] = createSignal('');
  const [codes, setCodes] = createSignal<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = createSignal(30);

  // Initialize database and load accounts
  onMount(async () => {
    try {
      await db.init();
      const savedAccounts = await db.getAllAccounts();
      setAccounts(savedAccounts);
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  });

  // Update TOTP codes every second
  createEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const secondsLeft = 30 - (now % 30);
      setTimeLeft(secondsLeft);

      const newCodes: Record<string, string> = {};
      accounts().forEach(account => {
        try {
          newCodes[account.id] = window.otplib.authenticator.generate(account.secret);
        } catch (error) {
          newCodes[account.id] = error.toString();
        }
      });
      setCodes(newCodes);
    }, 1000);

    return () => clearInterval(interval);
  });

  const addAccount = async (e: Event) => {
    e.preventDefault();
    if (!newName() || !newSecret()) return;

    const newAccount: Account = {
      id: crypto.randomUUID(),
      name: newName(),
      secret: newSecret().replace(/\s/g, ''),
    };

    try {
      await db.addAccount(newAccount);
      setAccounts([...accounts(), newAccount]);
      setNewName('');
      setNewSecret('');
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  const removeAccount = async (id: string) => {
    try {
      await db.removeAccount(id);
      setAccounts(accounts().filter(account => account.id !== id));
    } catch (error) {
      console.error('Failed to remove account:', error);
    }
  };

  const ProgressRing = (props: { progress: number }) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const progress = (props.progress / 30) * circumference;

    return (
      <svg class="progress-ring" width="36" height="36">
        <circle
          stroke="rgba(255,255,255,0.1)"
          stroke-width="3"
          fill="transparent"
          r={radius}
          cx="18"
          cy="18"
        />
        <circle
          stroke="rgba(255,255,255,0.8)"
          stroke-width="3"
          stroke-dasharray={`${circumference} ${circumference}`}
          stroke-dashoffset={circumference - progress}
          stroke-linecap="round"
          fill="transparent"
          r={radius}
          cx="18"
          cy="18"
        />
      </svg>
    );
  };

  return (
    <div class="min-h-screen p-4 pb-20">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Authenticator
        </h1>

        <form onSubmit={addAccount} class="glass rounded-2xl p-6 mb-8">
          <div class="mb-4">
            <label class="block text-white/80 text-sm font-medium mb-2" for="name">
              Account Name
            </label>
            <input
              id="name"
              type="text"
              value={newName()}
              onInput={(e) => setNewName(e.currentTarget.value)}
              class="w-full px-4 py-2 rounded-lg glass-darker text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="e.g., Google Account"
              required
            />
          </div>

          <div class="mb-6">
            <label class="block text-white/80 text-sm font-medium mb-2" for="secret">
              Secret Key
            </label>
            <input
              id="secret"
              type="text"
              value={newSecret()}
              onInput={(e) => setNewSecret(e.currentTarget.value)}
              class="w-full px-4 py-2 rounded-lg glass-darker text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Enter TOTP secret key"
              required
            />
          </div>

          <button
            type="submit"
            class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            Add Account
          </button>
        </form>

        <div class="space-y-4">
          <For each={accounts()}>
            {(account) => (
              <div class="glass rounded-2xl p-6 relative overflow-hidden group">
                <div class="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <button
                  onClick={() => removeAccount(account.id)}
                  class="absolute top-4 right-4 text-white/40 hover:text-red-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
                <h3 class="text-xl font-medium mb-4 text-white/90">{account.name}</h3>
                <div class="flex items-center justify-between">
                  <div class="text-3xl font-mono tracking-wider text-white">
                    {codes()[account.id]?.match(/.{1,3}/g)?.join(' ') || '-- --- ---'}
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-white/60">{timeLeft()}s</span>
                    <ProgressRing progress={timeLeft()} />
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

export default App;