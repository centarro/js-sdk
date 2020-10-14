// @todo test updateCartItem
// @todo test removeCartItem
// @todo test applyPromotionalCode
// @todo test custom fields and include
import { setupMockServer } from '../__mocks__/mock_server';
import { HttpClient } from '../index';
import { JsonApiErrors } from '../jsonapi_errors';

setupMockServer();

test('api prefix requires slash', () => {
  expect(() => {
    new HttpClient(`https://localhost:8080`, `jsonapi`);
  }).toThrowError('apiPrefix must begin with "/"');
});

describe('test request', () => {
  const client = new HttpClient(`https://localhost:8080`, `/jsonapi`, `test_token`);

  test('test request rejected', async () => {
    try {
      await client.request(`/does-not-exist`);
      throw new Error('did not throw error');
    } catch (e) {
      expect(e).toBeInstanceOf(JsonApiErrors);
    }
  });
  test('404 jsonapi', async () => {
    try {
      await client.request(`/not-found`);
      throw new Error('did not throw error');
    } catch (e) {
      if (!(e instanceof JsonApiErrors)) {
        expect(e).toBeInstanceOf(JsonApiErrors);
      }
      expect(e.getErrors()[0].status).toBe('404');
      expect(e.getErrors()[0].detail).toBe('could not find response');
    }
  });
  test('401 html content', async () => {
    try {
      await client.request(`/access-denied`);
      throw new Error('did not throw error');
    } catch (e) {
      if (!(e instanceof JsonApiErrors)) {
        expect(e).toBeInstanceOf(JsonApiErrors);
      }
      expect(e.getErrors()[0].title).toBe('response did not return JSON:API');
      expect(e.getErrors()[0].status).toBe('401');
    }
  });
});

describe('test entrypoint', () => {
  test('entrypoint', async () => {
    const client = new HttpClient(`https://localhost:8080`, `/jsonapi`);
    const json = await client.getEntrypoint();
    expect(json?.data).toStrictEqual([]);
    expect(json?.links.self.href).toBe('https://localhost:8080/jsonapi');
  });
});

describe('test get cart', () => {
  test('get cart as empty', async () => {
    const client = new HttpClient(`https://localhost:8080`, `/jsonapi`, 'token', 'STORE_ID');
    const { cart } = await client.getCart();
    expect(cart).toBeUndefined();
  });
  test('get cart with data', async () => {
    const client = new HttpClient(`https://localhost:8080`, `/jsonapi`);
    const { cart, included } = await client.getCart();
    expect(cart.id).toBe('e01c73af-e825-44e6-8530-6a4dc663a44f');
    expect(included.length).toBe(2);
  });
  test('get cart as absolute url', async () => {
    const client = new HttpClient(`https://localhost:8080`, `/jsonapi`);
    const { data, included } = await client.request(
      `https://localhost:8080/jsonapi/carts?include=order_items%2Corder_items.purchased_entity`,
    );
    if (!data || !included) {
      throw new Error('`data` and `included` should not have been null');
    }
    expect(included.length).toBe(2);
  });
});

describe('test add to cart', () => {
  test('add to cart', async () => {
    const client = new HttpClient(`https://localhost:8080`, `/jsonapi`);
    const result = await client.addToCart(
      {
        type: 'product-variation--simple',
        id: '8ccb12f6-5465-454c-8495-5346798f9b68',
      },
      1,
    );
    if (result) {
      const { cartItem, cart, included } = result;
      expect(cartItem.attributes.title).toBe('The Adventure Begins Camping Mug');
      expect(cart.id).toBe('e01c73af-e825-44e6-8530-6a4dc663a44f');
      expect(included.length).toBe(3);
    }
  });
});
