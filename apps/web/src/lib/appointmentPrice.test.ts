import { describe, expect, it } from 'vitest';
import { appointmentPrice, formatPrice } from './appointmentPrice';

describe('appointmentPrice', () => {
  it('bierze cenę po rabacie zapisaną przy wizycie, a nie cennikową', () => {
    const price = appointmentPrice({
      priceAtBooking: '180.00',
      finalPrice: '150.00',
      service: { price: '180.00' },
    });
    expect(price).toEqual({ base: 180, final: 150, hasDiscount: true });
  });

  it('nie zgłasza rabatu, gdy cena końcowa równa się bazowej', () => {
    const price = appointmentPrice({ priceAtBooking: 110, finalPrice: 110, service: { price: 110 } });
    expect(price).toEqual({ base: 110, final: 110, hasDiscount: false });
  });

  it('trzyma cenę z dnia rezerwacji, gdy cennik się później zmienił', () => {
    const price = appointmentPrice({ priceAtBooking: '100.00', finalPrice: '100.00', service: { price: '140.00' } });
    expect(price).toEqual({ base: 100, final: 100, hasDiscount: false });
  });

  it('wraca do ceny usługi, gdy wizyta nie ma zapisanej ceny', () => {
    expect(appointmentPrice({ service: { price: '90.00' } })).toEqual({ base: 90, final: 90, hasDiscount: false });
  });

  it('zwraca null, gdy nie ma żadnej ceny', () => {
    expect(appointmentPrice({ service: null })).toBeNull();
  });
});

describe('formatPrice', () => {
  it('pomija grosze przy pełnych kwotach', () => {
    expect(formatPrice(150)).toBe('150');
    expect(formatPrice(149.5)).toBe('149.50');
  });
});
