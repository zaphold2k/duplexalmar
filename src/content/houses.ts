export const HOUSE_SLUGS = ['casa-rosa', 'casa-verde'] as const;
export type HouseSlug = (typeof HOUSE_SLUGS)[number];

export interface HouseCapacity {
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  /** Descripción legible de las camas, no sólo el conteo (ver anexo del anfitrión). */
  beds: string;
}

export interface HouseContent {
  slug: HouseSlug;
  name: string;
  /** Frase corta que la distingue de la otra casa en el predio. */
  tagline: string;
  /** Prosa descriptiva de la casa, lista para mostrarse en su página. */
  description: string;
  capacity: HouseCapacity;
  /** Servicios y equipamiento, en el orden en que conviene mostrarlos. */
  services: string[];
  /**
   * Diferenciales frente a la oferta habitual de la zona: deben tener
   * presencia propia en la página, no quedar sepultados en `services`.
   */
  highlights: string[];
  /** Condiciones de la estadía (horarios, mascotas, estacionamiento, etc). */
  rules: string[];
}

/**
 * Contenido tipado de las dos casas. Datos confirmados por el anfitrión (ver
 * design.md, "Anexo: contenido confirmado"). El tipo `Record<HouseSlug,
 * HouseContent>` con todos los campos requeridos obliga a completar cada
 * campo en las dos casas: omitir uno, o toda una casa, no compila.
 */
export const houses: Record<HouseSlug, HouseContent> = {
  'casa-rosa': {
    slug: 'casa-rosa',
    name: 'Casa Rosa',
    tagline: 'La casa del frente, con balcón sobre el mar',
    description:
      'La Casa Rosa es la que da al frente del predio, cruzando la ruta costera de la playa. ' +
      'La planta baja es un ambiente integrado de cocina, comedor y estar, con piso de cerámica ' +
      'terracota y techo de vigas de tronco a la vista; una escalera metálica abierta sube a la ' +
      'planta alta, donde el dormitorio matrimonial tiene salida directa al balcón de madera con ' +
      'vista al mar. Abajo, un segundo dormitorio reúne las tres camas individuales de la casa. ' +
      'El estar tiene una pared pintada de rojo ladrillo con cortinas blancas, y por fuera la ' +
      'galería cubierta —con pérgola de troncos, piso de piedra partida y canteros de agapantos y ' +
      'geranios— se arma con muebles de madera de pallet: es el rincón que más se usa de la casa. ' +
      'La decoración acompaña el espíritu playero de siempre: tabla de surf y skate en la pared, ' +
      'objetos de mimbre y madera, cuadros de barcos. Tiene carácter propio, no es un departamento neutro.',
    capacity: {
      maxGuests: 5,
      bedrooms: 2,
      bathrooms: 1,
      floors: 2,
      beds: '3 camas individuales (una simple y una cucheta) en planta baja, y 1 cama matrimonial en planta alta',
    },
    services: [
      'Cocina equipada: cocina con horno, heladera, microondas, horno eléctrico chico, pava eléctrica y termotanque eléctrico',
      'Parrilla propia bajo la pérgola',
      'Wifi de alta velocidad',
      'Televisor con DirecTV prepago',
      'Calefacción con salamandra a leña y calefactor a gas',
    ],
    highlights: ['Ropa de cama y toallas incluidas', 'Apto para ir con mascotas'],
    rules: [
      'Horarios de ingreso y egreso flexibles',
      'Estacionamiento dentro del predio',
      'La cocina y la calefacción funcionan a gas de garrafa: coordinar la provisión con el anfitrión antes de llegar',
    ],
  },
  'casa-verde': {
    slug: 'casa-verde',
    name: 'Casa Verde',
    tagline: 'La casa de atrás, con la planta alta integrada',
    description:
      'La Casa Verde queda detrás de la Rosa en el mismo predio y, aunque está más lejos de la ' +
      'ruta, su planta alta también mira al mar por encima de la galería de adelante. Comparte el ' +
      'plano de la casa del frente: abajo, un ambiente integrado de cocina, comedor y estar con piso ' +
      'de cerámica terracota y techo de vigas de tronco, con una pared revestida en piedra que le da ' +
      'un carácter más rústico. Arriba, en cambio, es un único ambiente amplio de piso de madera que ' +
      'reúne dormitorio, estar y televisor: cama matrimonial, sofá cama, y una mesa con sillas de ' +
      'mimbre. Afuera, la galería cubierta con pérgola de troncos se arma con mobiliario también de ' +
      'troncos y una hamaca paraguaya, junto a los mismos canteros de agapantos y geranios que separan ' +
      'las dos casas. La misma decoración náutica y de playa acumulada con los años —anclas, salvavidas, ' +
      'objetos de mimbre y madera— le da personalidad propia.',
    capacity: {
      maxGuests: 3,
      bedrooms: 1,
      bathrooms: 1,
      floors: 2,
      beds: '1 cama matrimonial y 1 sillón cama, en el ambiente integrado de la planta alta',
    },
    services: [
      'Cocina equipada: cocina con horno, heladera, microondas, horno eléctrico chico, pava eléctrica y termotanque eléctrico',
      'Parrilla propia bajo la pérgola',
      'Wifi de alta velocidad',
      'Televisor con DirecTV prepago',
      'Calefacción con salamandra a leña y calefactor a gas',
    ],
    highlights: ['Ropa de cama y toallas incluidas', 'Apto para ir con mascotas'],
    rules: [
      'Horarios de ingreso y egreso flexibles',
      'Estacionamiento dentro del predio',
      'La cocina y la calefacción funcionan a gas de garrafa: coordinar la provisión con el anfitrión antes de llegar',
    ],
  },
};

export function getHouseContent(slug: HouseSlug): HouseContent {
  return houses[slug];
}

export function isHouseSlug(value: string): value is HouseSlug {
  return (HOUSE_SLUGS as readonly string[]).includes(value);
}
