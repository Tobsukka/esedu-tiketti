/**
 * Jest-konfiguraatio ESM + TypeScript -projektille.
 *
 * Projekti käyttää ES-moduuleja ("type": "module") ja NodeNext-resoluutiota,
 * joten testit tarvitsevat ESM-tilan:
 *   - ts-jest:n ESM-preset ja useESM
 *   - extensionsToTreatAsEsm .ts-tiedostoille
 *   - moduleNameMapper poistaa .js-päätteen suhteellisista importeista,
 *     koska lähdekoodi viittaa käännettyihin tiedostoihin (NodeNext vaatii sen)
 *
 * Aja: npm test  (skripti asettaa NODE_OPTIONS=--experimental-vm-modules)
 */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: { module: 'ESNext', moduleResolution: 'bundler' } }],
  },
  clearMocks: true,
};
