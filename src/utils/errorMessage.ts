type PostgrestErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function mentionsCart(text: string): boolean {
  return /gfm_cart|cart_items/i.test(text);
}

function mentionsHousehold(text: string): boolean {
  return /gfm_households|gfm_household_members|household_id|gfm_delivery_schedules/i.test(text);
}

function mentionsApproval(text: string): boolean {
  return /account_status|community_id|gfm_communities|gfm_approval|gfm_notifications|approved_at|rejection_reason|\btower\b|\bemail\b/i.test(
    text,
  );
}

function isSchemaCacheError(code: string | undefined, message: string): boolean {
  return (
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('Could not find')
  );
}

function isNetworkError(text: string): boolean {
  return /network request failed|failed to fetch|fetch failed|networkerror|getaddrinfo|enotfound|econnrefused|err_internet_disconnected|econnreset|timeout/i.test(
    text,
  );
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!error) {
    return fallback;
  }

  const pg = error as PostgrestErrorLike;
  const rawMsg =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const combined = [pg.message, pg.details, pg.hint, rawMsg, fallback].filter(Boolean).join(' ');

  if (isNetworkError(combined)) {
    return 'Unable to connect to Supabase (Network request failed). Please check your internet connection or verify if your Supabase project is active (unpaused) at supabase.com/dashboard.';
  }

  if (pg.code === '23505') {
    return 'This mobile number is already registered. Please sign in instead.';
  }

  if (pg.code === 'PGRST116') {
    return 'Record not found.';
  }

  if (pg.code === 'PGRST204' || pg.code === 'PGRST205') {
    if (mentionsHousehold(combined)) {
      return 'Household schema missing. Run supabase/gfm_households.sql and gfm_household_members.sql in Supabase SQL Editor, wait ~10s, then reload the app.';
    }
    if (mentionsApproval(combined)) {
      return 'Approval schema missing. Run supabase/gfm_user_approval.sql in Supabase SQL Editor, wait ~10s, then reload the app.';
    }
    if (mentionsCart(combined)) {
      return 'Cart table missing. Run supabase/gfm_cart.sql in Supabase SQL Editor, wait ~10s, then reload the app.';
    }
    return 'Database schema is out of date. Run supabase/gfm_user_approval.sql (registration) or gfm_cart.sql (cart) in Supabase SQL Editor, then reload the app.';
  }

  if (typeof pg.message === 'string' && pg.message.length > 0) {
    if (isSchemaCacheError(pg.code, pg.message)) {
      if (mentionsHousehold(pg.message) || mentionsHousehold(fallback)) {
        return 'Household schema not ready. Run supabase/gfm_households.sql and gfm_household_members.sql in Supabase SQL Editor, wait ~10s, then reload the app.';
      }
      if (mentionsApproval(pg.message) || mentionsApproval(fallback)) {
        return 'Approval schema not ready. Run supabase/gfm_user_approval.sql in Supabase SQL Editor, wait ~10s, then reload the app.';
      }
      if (mentionsCart(pg.message) || mentionsCart(fallback)) {
        return 'Cart table not ready. Run supabase/gfm_cart.sql in Supabase SQL Editor, wait ~10s, then reload the app.';
      }
      return 'Supabase table not ready. Run supabase/gfm_user_approval.sql in Supabase SQL Editor, wait ~10s, then reload the app.';
    }
    if (pg.message.includes('Native module is null') || pg.message.includes('cannot create db')) {
      return 'Storage module not linked. Rebuild the app once: npm run ios';
    }
    return pg.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
