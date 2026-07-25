import * as bcrypt from 'bcrypt';

/**
 * 密码哈希工具（bcrypt）。
 * 项目已依赖 `bcrypt`，避免引入 argon2 的 native 编译风险。
 * `PASSWORD_METHOD` 写入 `EmailAuth.passwordEncryptionMethod` 以记录所用算法。
 */
const BCRYPT_ROUNDS = 12;

export const PASSWORD_METHOD = 'Bcrypt' as const;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
