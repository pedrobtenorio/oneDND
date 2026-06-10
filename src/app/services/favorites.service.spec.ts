import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  const storageKey = 'favorite-test-items';

  beforeEach(() => {
    localStorage.clear();
    service = new FavoritesService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads an empty set when storage is empty', (done) => {
    service.getFavorites(storageKey).subscribe((favorites) => {
      expect(favorites.size).toBe(0);
      done();
    });
  });

  it('toggles favorites and persists them', (done) => {
    service.toggle(storageKey, 'item-a');

    service.getFavorites(storageKey).subscribe((favorites) => {
      expect(favorites.has('item-a')).toBeTrue();
      expect(JSON.parse(localStorage.getItem(storageKey) ?? '[]')).toEqual(['item-a']);
      done();
    });
  });

  it('returns a defensive snapshot of current favorites', () => {
    service.toggle(storageKey, 'item-a');

    const snapshot = service.getSnapshot(storageKey);
    snapshot.delete('item-a');

    expect(service.has(storageKey, 'item-a')).toBeTrue();
  });

  it('ignores invalid storage payloads', (done) => {
    localStorage.setItem(storageKey, '{"bad":true}');
    service = new FavoritesService();

    service.getFavorites(storageKey).subscribe((favorites) => {
      expect(favorites.size).toBe(0);
      done();
    });
  });
});
