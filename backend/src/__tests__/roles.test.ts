import { describe, it, expect } from '@jest/globals';
import { UserRole } from '@prisma/client';
import { hasRoleLevel, isStaff, STAFF_ROLES, AI_TOOL_ROLES, ROLE_LEVEL } from '../utils/roles.js';

/**
 * Roolihierarkian oikeusmatriisi.
 *
 * Nämä testit lukitsevat sen, kuka pääsee mihinkin. Erityisen tärkeää on,
 * että SUPPORT (= harjoitteleva opiskelija) EI pääse AI-työkaluihin: sitä
 * kautta vuotaisivat harjoitustikettien ratkaisut.
 */
describe('roolihierarkia', () => {
  const kaikkiRoolit: UserRole[] = ['USER', 'SUPPORT', 'TEACHER', 'ADMIN'] as UserRole[];

  it('järjestää roolit nousevasti', () => {
    expect(ROLE_LEVEL.USER).toBeLessThan(ROLE_LEVEL.SUPPORT);
    expect(ROLE_LEVEL.SUPPORT).toBeLessThan(ROLE_LEVEL.TEACHER);
    expect(ROLE_LEVEL.TEACHER).toBeLessThan(ROLE_LEVEL.ADMIN);
  });

  it('tuntee kaikki UserRole-enumin arvot', () => {
    // Jos enumiin lisätään rooli ilman tasoa, hierarkia hajoaa hiljaa
    for (const role of Object.values(UserRole)) {
      expect(ROLE_LEVEL[role]).toBeDefined();
    }
  });

  describe.each([
    // rooli,     tiketit(SUPPORT), AI-työkalut, AI-asetukset(ADMIN), isStaff
    ['USER', false, false, false, false],
    ['SUPPORT', true, false, false, true],
    ['TEACHER', true, true, false, true],
    ['ADMIN', true, true, true, true],
  ])('%s', (role, tiketit, aiTyokalut, asetukset, staff) => {
    const r = role as UserRole;

    it(`pääsy tikettitoimintoihin: ${tiketit}`, () => {
      expect(hasRoleLevel(r, 'SUPPORT' as UserRole)).toBe(tiketit);
    });

    it(`pääsy AI-työkaluihin: ${aiTyokalut}`, () => {
      expect(AI_TOOL_ROLES.some((vaadittu) => hasRoleLevel(r, vaadittu))).toBe(aiTyokalut);
    });

    it(`pääsy AI-asetuksiin: ${asetukset}`, () => {
      expect(hasRoleLevel(r, 'ADMIN' as UserRole)).toBe(asetukset);
    });

    it(`isStaff: ${staff}`, () => {
      expect(isStaff(r)).toBe(staff);
    });
  });

  it('ei pidä tuntematonta roolia henkilökuntana', () => {
    expect(isStaff('SOMETHING_ELSE')).toBe(false);
    expect(isStaff(null)).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });

  it('sisällyttää TEACHER-roolin tukihenkilölistauksiin', () => {
    expect(STAFF_ROLES).toEqual(expect.arrayContaining(['SUPPORT', 'TEACHER', 'ADMIN']));
    expect(STAFF_ROLES).not.toContain('USER');
  });
});
