/**
 * Roolien hierarkia ja apufunktiot.
 *
 * Vastaa backendin utils/roles.ts-tiedostoa. Suurempi luku sisältää pienemmän
 * oikeudet, joten uusi rooli ei vaadi jokaisen yksittäisen ehdon päivittämistä.
 *
 *   USER    - opiskelija tai muu peruskäyttäjä, luo tikettejä
 *   SUPPORT - harjoitteleva tukihenkilö (opiskelija), käsittelee tikettejä
 *   TEACHER - opettaja: tukihenkilön oikeudet + AI-työkalut
 *   ADMIN   - järjestelmänvalvoja: kaikki oikeudet
 */
export const ROLE_LEVEL = {
  USER: 0,
  SUPPORT: 1,
  TEACHER: 2,
  ADMIN: 3,
};

/** Onko rooli vähintään vaaditun tasoinen? */
export const hasRoleLevel = (role, required) =>
  (ROLE_LEVEL[role] ?? -1) >= (ROLE_LEVEL[required] ?? 0);

/** Tukihenkilötason käyttäjä: käsittelee tikettejä ja käyttää AI-avustajaa. */
export const isStaff = (role) => hasRoleLevel(role, 'SUPPORT');

/** AI-työkalut: tikettien generointi, ratkaisut ja analytiikka. */
export const canUseAiTools = (role) => hasRoleLevel(role, 'TEACHER');

/** Järjestelmän asetukset, roolien hallinta ja massapoisto. */
export const isAdmin = (role) => role === 'ADMIN';

/** Roolin suomenkielinen nimi käyttöliittymään. */
export const getRoleText = (role) => {
  switch (role) {
    case 'ADMIN':
      return 'Järjestelmänvalvoja';
    case 'TEACHER':
      return 'Opettaja';
    case 'SUPPORT':
      return 'Tukihenkilö';
    case 'USER':
      return 'Opiskelija';
    default:
      return role;
  }
};

/** Käyttäjähallinnassa myönnettävissä olevat roolit. */
export const ASSIGNABLE_ROLES = ['USER', 'SUPPORT', 'TEACHER'];
