import { describe, expect, it } from 'vitest';
import { whatsAppGenericMessage, whatsAppMessageForHouse, whatsAppUrl } from './whatsapp';

describe('whatsAppUrl', () => {
  it('arma el enlace de wa.me con el mensaje codificado como query param', () => {
    const url = whatsAppUrl('5492235293371', 'Hola!');

    expect(url).toBe('https://wa.me/5492235293371?text=Hola%21');
  });
});

describe('whatsAppMessageForHouse', () => {
  it('el mensaje menciona el nombre de la casa', () => {
    expect(whatsAppMessageForHouse('la Casa Verde')).toContain('la Casa Verde');
    expect(whatsAppMessageForHouse('la Casa Rosa')).toContain('la Casa Rosa');
  });
});

describe('whatsAppGenericMessage', () => {
  it('no menciona ninguna casa en particular', () => {
    const message = whatsAppGenericMessage();

    expect(message).not.toMatch(/casa rosa|casa verde/i);
  });
});
