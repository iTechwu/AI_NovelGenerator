'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@repo/ui';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/api/contracts/client';
import { setLoginData } from '@/lib/storage';
import type { LoginSuccess } from '@repo/contracts';

/**
 * 本地账号密码登录页（自建认证）。
 * 不再重定向到 sso.dofe.ai；提交直接调用本地 authContract.loginByEmail。
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.loginByEmail({ body: { email, password } });
      if (res.status === 200 && res.body?.data) {
        setLoginData(res.body.data);
        router.replace(callbackUrl);
        router.refresh();
      } else {
        setError(res.body?.msg || '登录失败，请检查邮箱与密码');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border p-6 shadow-sm"
      >
        <h1 className="text-center text-xl font-semibold text-foreground">登录</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className="h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          className="h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          登录
        </Button>
      </form>
    </div>
  );
}
