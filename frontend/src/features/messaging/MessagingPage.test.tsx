import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessagingPage } from './MessagingPage';

const xssPayload = '<img src=x onerror=alert(1)><script>alert(2)</script>';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    activeTenant: { id: '11', type: 'HIMA', name: 'HIMA A', roles: ['HIMA_ADMIN'] },
  }),
}));
vi.mock('@/hooks/useApiResource', () => ({
  useApiResource: (endpoint: string | null) => {
    const common = { error: null, isLoading: false, reload: vi.fn() };
    if (endpoint === '/messaging/conversations')
      return {
        ...common,
        data: [
          {
            id: '5',
            subject: 'Keamanan',
            hmj_tenant_id: '10',
            hima_tenant_id: '11',
            unreadCount: 1,
            tenants_conversations_hmj_tenant_idTotenants: {
              id: '10',
              code: 'HMJ',
              name: 'HMJ A',
              tenant_type: 'HMJ',
            },
            tenants_conversations_hima_tenant_idTotenants: {
              id: '11',
              code: 'HIMA',
              name: 'HIMA A',
              tenant_type: 'HIMA',
            },
          },
        ],
      };
    if (endpoint === '/messaging/conversations/5/messages')
      return {
        ...common,
        data: [
          {
            id: '7',
            body: xssPayload,
            sender_tenant_id: '10',
            sent_at: '2026-09-28T12:00:00.000Z',
            users: { full_name: 'Reviewer' },
          },
        ],
      };
    return { ...common, data: [] };
  },
}));

describe('MessagingPage output encoding', () => {
  it('renders untrusted message HTML as text without creating executable elements', () => {
    const { container } = render(<MessagingPage unreadOnly />);

    expect(screen.getByText(xssPayload)).toBeTruthy();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
