import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

export const qk = {
  authConfig: ['auth', 'config'] as const,
  profile: ['me', 'profile'] as const,
  passkeys: ['me', 'passkeys'] as const,
  oidcBindings: ['oidc', 'my-bindings'] as const,
  admin: {
    root: ['admin'] as const,
    commissions: ['admin', 'commissions'] as const,
    users: ['admin', 'users'] as const,
    games: ['admin', 'games'] as const,
    groups: ['admin', 'groups'] as const,
    groupCommissions: ['admin', 'group-commissions'] as const,
    messages: ['admin', 'messages'] as const,
    audit: ['admin', 'audit'] as const,
    reminders: ['admin', 'reminders'] as const,
    notes: ['admin', 'reminders', 'notes'] as const,
    template: ['admin', 'reminders', 'template'] as const,
    settings: ['admin', 'settings'] as const,
    fonts: ['admin', 'fonts'] as const,
    oidcProviders: ['admin', 'oidc', 'providers'] as const,
  },
  user: {
    root: ['user'] as const,
    commissions: ['user', 'me', 'commissions'] as const,
    groupCommissions: ['user', 'me', 'group-commissions'] as const,
    progress: ['user', 'me', 'progress'] as const,
    note: ['user', 'me', 'note'] as const,
    messages: ['user', 'me', 'messages'] as const,
    games: ['user', 'me', 'games'] as const,
    reminder: ['user', 'me', 'reminder'] as const,
  },
} as const
