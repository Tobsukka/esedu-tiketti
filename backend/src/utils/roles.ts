import { UserRole } from '@prisma/client';

/**
 * Roolien hierarkia.
 *
 * Suurempi luku sisältää pienemmän oikeudet. Tämän ansiosta uusi rooli ei
 * vaadi jokaisen yksittäisen tarkistuksen päivittämistä: esimerkiksi
 * requireRole(SUPPORT) läpäisee myös TEACHER- ja ADMIN-roolit.
 *
 *   USER    - opiskelija tai muu peruskäyttäjä, luo tikettejä
 *   SUPPORT - harjoitteleva tukihenkilö (opiskelija), käsittelee tikettejä
 *   TEACHER - opettaja: tukihenkilön oikeudet + AI-työkalut
 *   ADMIN   - järjestelmänvalvoja: kaikki oikeudet
 */
export const ROLE_LEVEL: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.SUPPORT]: 1,
  [UserRole.TEACHER]: 2,
  [UserRole.ADMIN]: 3,
};

/** Onko käyttäjän rooli vähintään vaaditun tasoinen? */
export const hasRoleLevel = (role: UserRole, required: UserRole): boolean =>
  ROLE_LEVEL[role] >= ROLE_LEVEL[required];

/**
 * Tikettien käsittelyyn oikeutetut roolit (tukihenkilötason toiminnot).
 * Käytä tätä sisäisissä tarkistuksissa `role === 'SUPPORT' || role === 'ADMIN'`
 * -tyylisten ehtojen sijaan, jotta uudet roolit eivät unohdu.
 */
export const isStaff = (role: UserRole | string | null | undefined): boolean =>
  role === UserRole.SUPPORT || role === UserRole.TEACHER || role === UserRole.ADMIN;

/** Roolit, jotka näkyvät tukihenkilölistoissa ja joille tiketin voi osoittaa. */
export const STAFF_ROLES: UserRole[] = [UserRole.SUPPORT, UserRole.TEACHER, UserRole.ADMIN];

/** AI-työkalut: tikettien generointi, ratkaisut ja analytiikka. */
export const AI_TOOL_ROLES: UserRole[] = [UserRole.TEACHER, UserRole.ADMIN];
