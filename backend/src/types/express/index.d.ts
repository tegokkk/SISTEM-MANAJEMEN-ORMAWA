import { AuthContextDTO } from '@sim-ormawa/contracts';

declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContextDTO;
    }
  }
}
