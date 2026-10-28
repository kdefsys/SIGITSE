import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  const user = {
    id: 7,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    role: Role.INSPECTOR,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const findUnique = jest.fn<() => Promise<typeof user | null>>();
  const create = jest.fn<() => Promise<typeof user>>();
  const signAsync = jest.fn<() => Promise<string>>();

  beforeEach(async () => {
    findUnique.mockReset();
    create.mockReset();
    signAsync.mockReset();
    signAsync.mockResolvedValue('signed-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique, create },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync,
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('includes the persisted user role in the registration token', async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(user);

    const result = await service.register({
      name: user.name,
      email: user.email,
      password: 'password123',
    });

    expect(signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: Role.INSPECTOR,
    });
    expect(result.token).toEqual({ access_token: 'signed-token' });
  });

  it('includes the persisted user role in the login token', async () => {
    const storedUser = {
      ...user,
      password: await bcrypt.hash('password123', 4),
    };
    findUnique.mockResolvedValue(storedUser);

    await service.login({ email: user.email, password: 'password123' });

    expect(signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: Role.INSPECTOR,
    });
  });
});
