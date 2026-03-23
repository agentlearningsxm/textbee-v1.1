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
import * as bcrypt from 'bcryptjs'

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
          { error: 'Unauthorized' },
          HttpStatus.UNAUTHORIZED,
        )
      }
    } else if (apiKeyString) {
      const regex = new RegExp(`^${apiKeyString.substr(0, 17)}`, 'g')
      const apiKey = await this.authService.findApiKey({
        apiKey: { $regex: regex },
        $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
      })

      if (apiKey) {
        if (bcrypt.compareSync(apiKeyString, apiKey.hashedApiKey)) {
          userId = apiKey.user
          request.apiKey = apiKey
          this.logger.debug(`API Key matched for user: ${userId}`)
        } else {
          this.logger.warn(`API Key bcrypt comparison failed for prefix: ${apiKeyString.substr(0, 17)}`)
        }
      } else {
        this.logger.warn(`No API Key found in DB for prefix: ${apiKeyString.substr(0, 17)}`)
      }
    } else {
      if (request.headers.authorization) {
        this.logger.warn('Authorization header present but not Bearer or invalid')
      } else {
        this.logger.warn('No authentication method provided (no Bearer token and no x-api-key)')
      }
    }

    if (userId) {
      const user = await this.usersService.findOne({ _id: userId })
      if (user) {
        request.user = user
        this.authService.trackAccessLog({ request })
        return true
      }
    }

    throw new HttpException(
      {
        error: 'Unauthorized',
        code: apiKeyString ? 'INVALID_API_KEY' : 'NO_CREDENTIALS',
        message: apiKeyString
          ? 'API key is invalid, revoked, or does not exist. Please generate a new key from the dashboard.'
          : 'No authentication credentials provided.',
      },
      HttpStatus.UNAUTHORIZED,
    )
  }
}
