import { describe, expect, it } from 'vitest';
import { getHouseContent, HOUSE_SLUGS, type HouseContent, houses, isHouseSlug } from './houses';

describe('houses — el tipo obliga a completar todos los campos', () => {
  it('no compila un objeto de casa al que le falte un campo requerido', () => {
    // @ts-expect-error falta `capacity`, `services`, `highlights` y `rules`: si
    // `HouseContent` alguna vez vuelve esos campos opcionales, este comentario
    // deja de ser necesario y `npm run typecheck` falla, avisando del cambio.
    const incomplete: HouseContent = {
      slug: 'casa-rosa',
      name: 'Casa Rosa',
      tagline: 'incompleta a propósito',
      description: 'incompleta a propósito',
    };

    expect(incomplete.slug).toBe('casa-rosa');
  });

  it('no compila un registro de casas al que le falte una de las dos casas', () => {
    // @ts-expect-error falta la entrada "casa-verde": `Record<HouseSlug,
    // HouseContent>` exige las dos claves.
    const incomplete: Record<'casa-rosa' | 'casa-verde', HouseContent> = {
      'casa-rosa': houses['casa-rosa'],
    };

    expect(Object.keys(incomplete)).toEqual(['casa-rosa']);
  });
});

describe('houses — contenido en tiempo de ejecución', () => {
  it('define exactamente las dos casas, con el slug como clave', () => {
    expect(Object.keys(houses).sort()).toEqual(['casa-rosa', 'casa-verde']);
    for (const slug of HOUSE_SLUGS) {
      expect(houses[slug].slug).toBe(slug);
    }
  });

  it('cada casa tiene todos los campos completos y no vacíos', () => {
    for (const slug of HOUSE_SLUGS) {
      const house = getHouseContent(slug);

      expect(house.name.length).toBeGreaterThan(0);
      expect(house.tagline.length).toBeGreaterThan(0);
      expect(house.description.length).toBeGreaterThan(0);
      expect(house.capacity.maxGuests).toBeGreaterThan(0);
      expect(house.capacity.bedrooms).toBeGreaterThan(0);
      expect(house.capacity.bathrooms).toBeGreaterThan(0);
      expect(house.capacity.floors).toBeGreaterThan(0);
      expect(house.capacity.beds.length).toBeGreaterThan(0);
      expect(house.services.length).toBeGreaterThan(0);
      expect(house.highlights.length).toBeGreaterThan(0);
      expect(house.rules.length).toBeGreaterThan(0);
    }
  });

  it('no reproduce la condición obsoleta de traer sábanas y toallas propias', () => {
    for (const slug of HOUSE_SLUGS) {
      const house = getHouseContent(slug);
      const allText = [
        house.description,
        ...house.services,
        ...house.highlights,
        ...house.rules,
      ].join(' ');

      expect(allText).not.toMatch(/traer\s+(sus\s+)?s[áa]banas/i);
      expect(house.highlights.some((h) => /ropa de cama y toallas incluidas/i.test(h))).toBe(true);
    }
  });

  it('menciona el gas de garrafa sin prometer que viene incluido', () => {
    for (const slug of HOUSE_SLUGS) {
      const house = getHouseContent(slug);
      const rulesText = house.rules.join(' ');

      expect(rulesText).toMatch(/garrafa/i);
      expect(rulesText).not.toMatch(/garrafa (incluida|provista|cargada)/i);
    }
  });
});

describe('isHouseSlug', () => {
  it('acepta los slugs válidos', () => {
    expect(isHouseSlug('casa-rosa')).toBe(true);
    expect(isHouseSlug('casa-verde')).toBe(true);
  });

  it('rechaza cualquier otro valor', () => {
    expect(isHouseSlug('casa-azul')).toBe(false);
    expect(isHouseSlug('')).toBe(false);
  });
});
