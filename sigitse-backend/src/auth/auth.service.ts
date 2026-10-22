import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Registrar un nuevo administrado / usuario
  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // 1. Verificar si el correo ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // 2. Encriptamos la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Creamos el usuario en la base de datos
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    // 4. Generaramos el Token JWT de sesión
    const token = this.generateToken(user.id, user.email);

    return {
      message: 'Usuario registrado exitosamente',
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }

  // Iniciar sesión
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Buscamos al usuario
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Comparamos la contraseña ingresada con el hash guardado
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Generamos Token JWT
    const token = this.generateToken(user.id, user.email);

    return {
      message: 'Inicio de sesión exitoso',
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  }

  // Método auxiliar para firmar Tokens JWT
  private generateToken(userId: number, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
