import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { UserRole } from '../../users/user-roles.enum'

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    if (request.user?.role === UserRole.ADMIN) {
      return true
    }

    throw new HttpException(
      { message: 'Admin access required. You do not have sufficient permissions.' },
      HttpStatus.FORBIDDEN,
    )
  }
}
