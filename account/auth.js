const section = document.querySelector('[data-account]');
const config = window.SK_ACCOUNT_CONFIG;
const status = section?.querySelector('[data-account-status]');
const buttons = section ? [...section.querySelectorAll('[data-provider]')] : [];
const signOut = section?.querySelector('[data-sign-out]');
if (section && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config?.url ?? '') &&
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey ?? '') &&
    Array.isArray(config.providers) && config.providers.length) {
  start().catch(() => { status.textContent = 'Sign-in is temporarily unavailable. You can still continue as a guest.'; });
}
async function start() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm');
  const auth = createClient(config.url, config.publishableKey, {
    auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true }
  }).auth;
  const callback = new URL('./', window.location.href);
  const params = new URL(window.location.href).searchParams;
  const failed = params.has('error') || params.has('error_description');
  const { data: { session }, error } = await auth.getSession();
  if (params.has('code') || failed) history.replaceState(null, '', callback.pathname);
  const render = (active, unavailable = false) => {
    for (const b of buttons) {
      b.hidden = active;
      b.disabled = !config.providers.includes(b.dataset.provider);
    }
    signOut.hidden = !active;
    status.textContent = active ? 'You’re signed in.' : unavailable ? 'Sign-in could not be completed. Try again or continue as a guest.' : 'Choose an available sign-in provider.';
  };
  render(Boolean(session), Boolean(error) || failed);
  for (const button of buttons) button.addEventListener('click', async () => {
    buttons.forEach(b => { b.disabled = true; });
    status.textContent = 'Opening sign-in…';
    try {
      const { error: signInError } = await auth.signInWithOAuth({
        provider: button.dataset.provider,
        options: { redirectTo: callback.href }
      });
      if (signInError) render(false, true);
    } catch { render(false, true); }
  });
  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    try {
      const { error: signOutError } = await auth.signOut();
      if (signOutError) throw signOutError;
      render(false);
    } catch { status.textContent = 'Could not sign out. Please try again.'; }
    finally { signOut.disabled = false; }
  });
}
