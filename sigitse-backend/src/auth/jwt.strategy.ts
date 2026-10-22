import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secreto_super_seguro_sigitse',
    });
  }

  async validate(payload: { sub: number; email: string }) {
    // Lo que retornemos aquí se inyectará en el objeto `request.user`
    return { userId: payload.sub, email: payload.email };
  }
}
