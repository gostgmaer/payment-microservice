import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/app-config.service';

export interface JwtPayload {
  sub: string; // user ID
  tenantId: string; // tenant this user belongs to
  email?: string;
  roles?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // RS256 asymmetric verification when IAM_JWT_PUBLIC_KEY (or legacy JWT_PUBLIC_KEY) is set; HS256 fallback otherwise.
      secretOrKey: config.jwtPublicKey ?? config.jwtSecret,
      ...(config.jwtPublicKey ? { algorithms: ['RS256'] } : {}),
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Passport attaches the return value to request.user
    return payload;
  }
}
