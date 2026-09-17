import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth';
import { AppError } from '@/lib/apiResponse';
import type { User as UserType, JwtPayload } from '@/types';

function toUser(doc: InstanceType<typeof User>): UserType {
  const obj = doc.toObject();
  return { ...obj, _id: String(obj._id) } as unknown as UserType;
}

export async function register(data: { name: string; email: string; password: string }): Promise<{
  user: UserType;
  accessToken: string;
  refreshToken: string;
}> {
  await connectDB();

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw new AppError('Email already in use', 400, 'EMAIL_TAKEN');

  const user = await User.create(data);
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: String(user._id),
    email: user.email,
    role: user.role,
  };

  return {
    user: toUser(user),
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function login(email: string, password: string): Promise<{
  user: UserType;
  accessToken: string;
  refreshToken: string;
}> {
  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: String(user._id),
    email: user.email,
    role: user.role,
  };

  return {
    user: toUser(user),
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function getMe(userId: string): Promise<UserType> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return toUser(user);
}
