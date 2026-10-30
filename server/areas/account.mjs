// Account: who is signed in (/api/me) - their profile, admin / owner, HR id, the owners' names, and whether the
// office AI password is set. (Sign-in, sign-out and the login check itself are in server.mjs.)
import { config } from '../config.mjs';
import { NEXT, send } from '../core.mjs';
import { auth, isAdmin, isOwner } from '../state.mjs';
import { jwtId } from '../hr.mjs';


export async function route(req, res, { u, p, user }) {
  if (p === '/api/me') return send(res, 200, { ...auth.publicUser(user.email), admin: isAdmin(user), owner: isOwner(user), aiReady: !!config.aiPassword,
    hrId: jwtId(auth.lighthouseToken(user) || ''), owners: config.owners || ['jaspreet', 'gurpreet'] }); // (HR id and the owners, who do not clock in: the new Office pages)
  return NEXT;
}
