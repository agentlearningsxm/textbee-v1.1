import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../../users/users.service'
import { AuthService } from '../auth.service'

@Injectable()
// Guard for authenticating users by either jwt token or api key
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private authService: AuthService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    let userId
    const apiKeyString = request.headers['x-api-key'] || request.query.apiKey
    if (request.headers.authorization?.startsWith('Bearer ')) {
      const bearerToken = request.headers.authorization.split(' ')[1]
      try {
        const payload = this.jwtService.verify(bearerToken)
        userId = payload.sub
      } catch (e) {
        throw new HttpException(
          { error: 'Unauthorized', code: 'AUTH_INVALID' },
          HttpStatus.UNAUTHORIZED,
        )
      }
    } else if (apiKeyString) {
      const apiKey = await this.authService.verifyApiKey(apiKeyString)

      if (apiKey) {
        userId = apiKey.user
        request.apiKey = apiKey
      }
    }

    if (userId) {
      const user = await this.usersService.findOne({ _id: userId })
      if (user) {
        // Re-check account state on every request, not just at login. Otherwise a
        // banned or de-approved user keeps full access until their (up to 60-day)
        // JWT expires. Admins are always exempt from the approval gate.
        this.authService.assertApproved(user)
        request.user = user
        this.authService.trackAccessLog({ request })
        return true
      }
    }

    throw new HttpException(
      { error: 'Unauthorized', code: 'AUTH_INVALID' },
      HttpStatus.UNAUTHORIZED,
    )
  }
}
