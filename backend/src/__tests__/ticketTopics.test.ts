import { describe, it, expect } from '@jest/globals';
import {
  TICKET_TOPICS,
  pickTicketTopic,
  pickDevice,
  pickSituation,
  getTopicById,
} from '../ai/config/ticketTopics.js';

/**
 * Aihearvonnan testit.
 *
 * TAUSTA: AI-generoidut tiketit käsittelivät aina samaa aihetta (ensin
 * tulostimet, sitten wifi), koska aiheen valinta oli jätetty kielimallille.
 * Aihe arvotaan nyt koodissa, mikä tekee logiikasta testattavan.
 */
describe('aihekatalogi', () => {
  it('sisältää aiheita ja jokaisella on vaaditut kentät', () => {
    expect(TICKET_TOPICS.length).toBeGreaterThanOrEqual(20);

    for (const topic of TICKET_TOPICS) {
      expect(topic.id).toMatch(/^[a-z0-9-]+$/);
      expect(topic.name.length).toBeGreaterThan(5);
      expect(topic.hint.length).toBeGreaterThan(5);
      expect(topic.complexity.length).toBeGreaterThan(0);
    }
  });

  it('ei sisällä kaksoiskappaleita tunnisteissa', () => {
    const ids = TICKET_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ei ole liian painottunut yhteen aihepiiriin', () => {
    // Alkuperäinen ongelma oli juuri yksipuolisuus: verkko- ja tulostinaiheita
    // saa olla, mutta ne eivät saa dominoida katalogia.
    const verkkoTaiTulostin = TICKET_TOPICS.filter((t) =>
      /wifi|verkko|vpn|tulost/i.test(t.id + t.name)
    );
    expect(verkkoTaiTulostin.length / TICKET_TOPICS.length).toBeLessThan(0.25);
  });
});

describe('pickTicketTopic', () => {
  const params = { categoryName: 'Tekniset ongelmat', complexity: 'moderate' };

  it('palauttaa aiheen, joka sopii pyydettyyn vaikeustasoon', () => {
    for (let i = 0; i < 50; i++) {
      const topic = pickTicketTopic(params);
      expect(topic.complexity).toContain('moderate');
    }
  });

  it('jättää poissuljetut aiheet arpomatta', () => {
    const kielletyt = TICKET_TOPICS.slice(0, 10).map((t) => t.id);

    for (let i = 0; i < 100; i++) {
      const topic = pickTicketTopic({ ...params, excludeIds: kielletyt });
      expect(kielletyt).not.toContain(topic.id);
    }
  });

  it('tuottaa vaihtelua eikä jumitu yhteen aiheeseen', () => {
    const osumat = new Set<string>();
    for (let i = 0; i < 200; i++) {
      osumat.add(pickTicketTopic(params).id);
    }
    // Tämä on se, mikä alun perin oli rikki: sama aihe joka kerta
    expect(osumat.size).toBeGreaterThan(10);
  });

  it('ei palauta samaa aihetta peräkkäin, kun historia välitetään', () => {
    const historia: string[] = [];
    for (let i = 0; i < 15; i++) {
      const topic = pickTicketTopic({ ...params, excludeIds: historia.slice(0, 10) });
      expect(historia.slice(0, 10)).not.toContain(topic.id);
      historia.unshift(topic.id);
    }
  });

  it('purkaa poissulkemisen, jos kaikki aiheet on jo käytetty', () => {
    // Varapolku: arvonta ei saa kaatua eikä jäädä jumiin
    const kaikki = TICKET_TOPICS.map((t) => t.id);
    const topic = pickTicketTopic({ ...params, excludeIds: kaikki });
    expect(kaikki).toContain(topic.id);
  });

  it('palauttaa aiheen myös tuntemattomalle kategorialle ja vaikeustasolle', () => {
    const topic = pickTicketTopic({ categoryName: 'Ei-olemassa-oleva', complexity: 'ultra' });
    expect(topic.id).toBeTruthy();
  });

  it('suodattaa kategorian mukaan, kun katalogissa on osumia', () => {
    for (let i = 0; i < 30; i++) {
      const topic = pickTicketTopic({ categoryName: 'Yleinen', complexity: 'simple' });
      const sopii = topic.categories.some((c) => /yleinen/i.test(c));
      expect(sopii).toBe(true);
    }
  });
});

describe('laite ja tilanne', () => {
  it('arpoo laitteen aiheen omista ehdotuksista, jos niitä on', () => {
    const topic = TICKET_TOPICS.find((t) => t.devices && t.devices.length > 0)!;
    for (let i = 0; i < 20; i++) {
      expect(topic.devices).toContain(pickDevice(topic));
    }
  });

  it('palauttaa tilanteen merkkijonona', () => {
    expect(typeof pickSituation()).toBe('string');
    expect(pickSituation().length).toBeGreaterThan(3);
  });
});

describe('getTopicById', () => {
  it('löytää aiheen tunnisteella', () => {
    const eka = TICKET_TOPICS[0];
    expect(getTopicById(eka.id)).toEqual(eka);
  });

  it('palauttaa undefined tuntemattomalle tunnisteelle', () => {
    expect(getTopicById('ei-ole-olemassa')).toBeUndefined();
  });
});
