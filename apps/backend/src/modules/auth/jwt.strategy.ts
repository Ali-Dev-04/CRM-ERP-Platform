import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../config/config.service';
import type { AuthUser } from '../../common/context/authenticated-request';

/**
 * Stateless JWT validation: signature + claims only. Active-session revocation
 * is bounded by the short access-token TTL (JWT_ACCESS_TTL, default 15m);
 * disabling a user immediately blocks refresh and, after the access token
 * expires, all access. A Redis blocklist can be layered in later if instant
 * revocation is required.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.value.JWT_ACCESS_SECRET,
    });
  }

  validate(payload: { sub: string; email: string }): AuthUser {
    return { userId: payload.sub, email: payload.email };
  }
}
