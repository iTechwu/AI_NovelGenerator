'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@repo/ui';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/api/contracts/client';

const inputClass =
  'h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary';

/**
 * 忘记密码：先发送邮箱验证码（purpose=reset_password），再用 验证码 + 新密码 重置。
 * 验证码在开发模式下输出到服务端日志（auth.service.issueCode）；生产需配置邮件凭证。
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function sendCode(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email) {
      setError('请先输入邮箱');
      return;
    }
    setSending(true);
    try {
      const res = await authClient.sendEmailCode({
        body: { email, purpose: 'reset_password' },
      });
      if (res.status === 200) {
        setInfo('验证码已发送（开发模式下请查看服务端日志）');
      } else {
        setError((res.body as { msg?: string })?.msg || '验证码发送失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败');
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const res = await authClient.resetPassword({
        body: { email, code, newPassword },
      });
      if (res.status === 200) {
        router.replace('/login');
      } else {
        setError((res.body as { msg?: string })?.msg || '重置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border p-6 shadow-sm"
      >
        <h1 className="text-center text-xl font-semibold text-foreground">找回密码</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="text-sm text-muted-foreground">{info}</p>}
        <div className="flex gap-2">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className={inputClass}
          />
          <Button type="button" variant="outline" onClick={sendCode} disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : '发送验证码'}
          </Button>
        </div>
        <input
          type="text"
          required
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="验证码"
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="新密码（至少 8 位）"
          className={inputClass}
        />
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          重置密码
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          想起来了？{' '}
          <Link href="/login" className="text-primary underline">
            返回登录
          </Link>
        </p>
      </form>
    </div>
  );
}
