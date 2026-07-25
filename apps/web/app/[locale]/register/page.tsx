'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@repo/ui';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/api/contracts/client';
import { setLoginData } from '@/lib/storage';
import type { LoginSuccess } from '@repo/contracts';

const inputClass =
  'h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.registerByEmail({
        body: { email, password, nickname: nickname || undefined },
      });
      const body = res.body as { msg?: string; data?: LoginSuccess } | undefined;
      if (res.status === 200 && body?.data) {
        setLoginData(body.data);
        router.replace('/');
        router.refresh();
      } else {
        setError(body?.msg || '注册失败，请稍后重试');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
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
        <h1 className="text-center text-xl font-semibold text-foreground">注册</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          className={inputClass}
        />
        <input
          type="text"
          autoComplete="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="昵称（可选）"
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码（至少 8 位）"
          className={inputClass}
        />
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          注册
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          已有账号？{' '}
          <Link href="/login" className="text-primary underline">
            登录
          </Link>
        </p>
      </form>
    </div>
  );
}
