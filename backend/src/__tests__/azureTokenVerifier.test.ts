import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Azure AD -tokenin tarkistuksen hyökkäystestit.
 *
 * TAUSTA: tokenin allekirjoituksen tarkistus poistettiin kerran tuotannosta
 * (commit 07efc46), koska kukaan ei pystynyt osoittamaan mikä siinä oli rikki.
 * Järjestelmä oli sen jälkeen vuoden ilman todennusta. Nämä testit lukitsevat
 * korjauksen paikalleen, jotta sama ei toistu huomaamatta.
 *
 * JWKS mockataan, joten testit eivät tarvitse verkkoa eivätkä oikeaa tenanttia.
 */

const TENANT = 'test-tenant-id';
const CLIENT = 'test-client-id';
const KID = 'test-key-id';

// Oma avainpari, joka esittää Microsoftin allekirjoitusavainta
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PUBLIC_PEM = publicKey.export({ type: 'spki', format: 'pem' }) as string;
const PRIVATE_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

// Hyökkääjän avainpari
const attacker = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const ATTACKER_PRIVATE_PEM = attacker.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

process.env.AZURE_TENANT_ID = TENANT;
process.env.AZURE_CLIENT_ID = CLIENT;

jest.unstable_mockModule('jwks-rsa', () => ({
  default: () => ({
    getSigningKey: (kid: string, cb: (err: Error | null, key?: unknown) => void) => {
      if (kid !== KID) {
        cb(new Error(`Unable to find a signing key that matches '${kid}'`));
        return;
      }
      cb(null, { getPublicKey: () => PUBLIC_PEM });
    },
  }),
}));

let verifyAzureToken: typeof import('../middleware/azureTokenVerifier.js').verifyAzureToken;
let extractUser: typeof import('../middleware/azureTokenVerifier.js').extractUser;

beforeAll(async () => {
  const mod = await import('../middleware/azureTokenVerifier.js');
  verifyAzureToken = mod.verifyAzureToken;
  extractUser = mod.extractUser;
});

const claims = (yliaja: Record<string, unknown> = {}) => ({
  preferred_username: 'opiskelija@esedu.fi',
  name: 'Testi Käyttäjä',
  oid: 'oid-123',
  iss: `https://login.microsoftonline.com/${TENANT}/v2.0`,
  aud: CLIENT,
  ...yliaja,
});

const allekirjoita = (payload: object, key: string, options: jwt.SignOptions = {}) =>
  jwt.sign(payload, key, { algorithm: 'RS256', keyid: KID, expiresIn: '1h', ...options });

/** Odottaa, että tarkistus hylkää tokenin annetulla virhekoodilla. */
const odotaHylkays = async (token: string, koodi?: string) => {
  await expect(verifyAzureToken(token)).rejects.toMatchObject(
    koodi ? { code: koodi } : { name: 'TokenVerificationError' }
  );
};

describe('verifyAzureToken', () => {
  it('hyväksyy kelvollisen tokenin', async () => {
    const payload = await verifyAzureToken(allekirjoita(claims(), PRIVATE_PEM));
    expect(payload.preferred_username).toBe('opiskelija@esedu.fi');
    expect(extractUser(payload)).toEqual({
      email: 'opiskelija@esedu.fi',
      name: 'Testi Käyttäjä',
      oid: 'oid-123',
    });
  });

  describe('hyökkäykset', () => {
    it('hylkää algoritmisekaannuksen (HS256 julkisella avaimella allekirjoitettuna)', async () => {
      // Klassinen hyökkäys: julkinen avain on tiedossa, joten hyökkääjä
      // allekirjoittaa sillä symmetrisesti. Torjunnan tekee tässä
      // jsonwebtoken itse (se kieltää HMACin julkisella avaimella), mutta
      // testi varmistaa ettei tilanne muutu kirjastoa päivitettäessä.
      // Oman algorithms-rajauksen kattaa erillinen PS256-testi.
      const token = jwt.sign(claims(), PUBLIC_PEM, { algorithm: 'HS256', keyid: KID, expiresIn: '1h' });
      await odotaHylkays(token);
    });

    it('hylkää sallitun listan ulkopuolisen algoritmin (PS256)', async () => {
      // PS256 on epäsymmetrinen ja käy samalle RSA-avaimelle, joten
      // jsonwebtoken hyväksyisi sen oletuksena. Torjunta tulee tässä
      // nimenomaan verifioijan omasta algorithms-rajauksesta.
      const token = allekirjoita(claims(), PRIVATE_PEM, { algorithm: 'PS256' });
      await odotaHylkays(token);
    });

    it('hylkää allekirjoittamattoman tokenin (alg: none)', async () => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const token = `${b64({ alg: 'none', typ: 'JWT', kid: KID })}.${b64(claims())}.`;
      await odotaHylkays(token);
    });

    it('hylkää vieraalla avaimella allekirjoitetun tokenin', async () => {
      await odotaHylkays(allekirjoita(claims(), ATTACKER_PRIVATE_PEM), 'INVALID_SIGNATURE');
    });

    it('hylkää vanhentuneen tokenin', async () => {
      const token = allekirjoita(claims({ iat: Math.floor(Date.now() / 1000) - 7200 }), PRIVATE_PEM, {
        expiresIn: '-1h',
      });
      await odotaHylkays(token, 'EXPIRED');
    });

    it('hylkää väärälle sovellukselle myönnetyn tokenin (audience)', async () => {
      await odotaHylkays(allekirjoita(claims({ aud: 'toinen-sovellus' }), PRIVATE_PEM), 'INVALID_CLAIMS');
    });

    it('hylkää toisesta tenantista tulleen tokenin (issuer)', async () => {
      const token = allekirjoita(
        claims({ iss: 'https://login.microsoftonline.com/vieras-tenant/v2.0' }),
        PRIVATE_PEM
      );
      await odotaHylkays(token, 'INVALID_CLAIMS');
    });

    it('hylkää tokenin, jonka headerista puuttuu kid', async () => {
      await odotaHylkays(jwt.sign(claims(), PRIVATE_PEM, { algorithm: 'RS256', expiresIn: '1h' }));
    });

    it('hylkää roskadatan', async () => {
      await odotaHylkays('ei-ole-token', 'MALFORMED');
    });
  });

  describe('Graph-token', () => {
    // Microsoft muokkaa Graph-tokenin allekirjoitusta tarkoituksella, joten
    // mikään muu palvelu ei voi tarkistaa sitä. Tämä oli alkuperäisen
    // tuotanto-ongelman juurisyy, joten siitä annetaan oma virhekoodinsa.
    it.each([
      ['GUID-muotoinen', '00000003-0000-0000-c000-000000000000'],
      ['URL-muotoinen', 'https://graph.microsoft.com'],
    ])('tunnistaa %s Graph-audiencen omaksi virheekseen', async (_nimi, aud) => {
      await odotaHylkays(allekirjoita(claims({ aud }), PRIVATE_PEM), 'GRAPH_TOKEN');
    });
  });

  describe('extractUser', () => {
    it('vaatii sähköpostin, nimen ja oid:n', () => {
      expect(() => extractUser({ preferred_username: 'a@b.fi' })).toThrow(/käyttäjätietoja/i);
    });

    it('lukee sähköpostin myös upn-kentästä', () => {
      const user = extractUser({ upn: 'a@b.fi', name: 'A', oid: 'o1' });
      expect(user.email).toBe('a@b.fi');
    });
  });
});
